/*
 * Park Easy engine — a JavaScript port of the classes and logic in
 * "Parking-Lot-Management (Park Easy).cpp" (Vehicle, Customer, ParkingLot,
 * plus the file-backed database/viplist), using localStorage instead of
 * database.csv / viplist.txt. The class shapes, menu flow, validation
 * rules, and admin codenames match the original .cpp file 1:1 — that
 * file itself is never touched.
 *
 * A few bugs in the original logic were deliberately fixed here (web
 * layer only, by explicit request) rather than ported as-is:
 *  - Billing now charges a real per-hour rate instead of dividing the
 *    elapsed hours by 10000/100000 (which made every bill read ~0).
 *  - VIP tiers are registered by an admin (case 5) against a UID and
 *    looked up at checkout, instead of being self-reported/unverified
 *    by the customer.
 *  - Retrieval reads back the parked vehicle's own wheels/type/entry
 *    time from its stored record instead of defaulting to zero, so the
 *    correct garage slot is freed and the bill reflects real duration.
 */

// ---------- persistence (stands in for database.csv / viplist.txt) ----------

const Store = {
  DB_KEY: 'parkeasy_database_csv',
  VIP_KEY: 'parkeasy_viplist_txt',
  SLOTS_KEY: 'parkeasy_slots',
  STATS_KEY: 'parkeasy_stats',

  loadDB() {
    return JSON.parse(localStorage.getItem(this.DB_KEY) || '[]');
  },
  saveDB(lines) {
    localStorage.setItem(this.DB_KEY, JSON.stringify(lines));
  },
  loadVip() {
    return JSON.parse(localStorage.getItem(this.VIP_KEY) || '[]');
  },
  saveVip(lines) {
    localStorage.setItem(this.VIP_KEY, JSON.stringify(lines));
  },
  loadSlots() {
    const raw = localStorage.getItem(this.SLOTS_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  saveSlots(available) {
    localStorage.setItem(this.SLOTS_KEY, JSON.stringify(available));
  },
  loadStats() {
    const raw = localStorage.getItem(this.STATS_KEY);
    return raw
      ? JSON.parse(raw)
      : { xp: 0, totalParked: 0, totalRetrieved: 0, totalRevenue: 0, badges: [] };
  },
  saveStats(stats) {
    localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
  },
};

// ---------- Vehicle (base class) ----------

class Vehicle {
  constructor(wheels, type, floorFinderNo, numberPlate) {
    this.vehicle_wheels = wheels;
    this.vehicle_type = type;
    this.floor_finder_no = floorFinderNo;
    this.number_plate = numberPlate;
  }
  getNumberPlate() {
    return this.number_plate;
  }
  getWheels() {
    return this.vehicle_wheels;
  }
  getType() {
    return this.vehicle_type;
  }
}

// ---------- Customer (extends Vehicle) ----------

class Customer extends Vehicle {
  constructor(wheels, type, floorNo, plate, entryTime) {
    super(wheels, type, floorNo, plate);
    this.entry_time = entryTime; // ms since epoch
    this.exit_time = null;
    this.vip_type = 'no';
  }

  setExitTime(exitTime) {
    this.exit_time = exitTime;
  }

  // Fixed billing: real per-hour rate (any part of an hour rounds up to a
  // full billable hour, minimum one), instead of the original's
  // hours/10000 (which never produced a nonzero bill in a normal session).
  calculateBill(exitTime) {
    const timeDiff = Math.max(0, Math.floor((exitTime - this.entry_time) / 1000)); // seconds, like difftime()
    const hours = Math.floor(timeDiff / 3600);
    const remainingMinutes = Math.floor((timeDiff % 3600) / 60);

    const ratePerHour = this.getWheels() === 1 ? 20 : 40; // 2-wheeler vs 4-wheeler flat rate
    const billableHours = Math.max(1, Math.ceil(timeDiff / 3600));
    const bill = billableHours * ratePerHour;

    return { hours, remainingMinutes, displayHours: hours, bill };
  }

  // mirrors calculateBill(time_t exit_time, string vip_type)
  calculateBillVip(exitTime, vipType) {
    let { bill } = this.calculateBill(exitTime);

    if (vipType === 'silver') bill -= bill * 0.1;
    else if (vipType === 'gold') bill -= bill * 0.15;
    else if (vipType === 'platinum') bill -= bill * 0.2;

    return Math.round(bill);
  }
}

// ---------- ParkingLot ----------

class ParkingLot {
  constructor(total4e, total2e, total2p, total4p) {
    this.total_slots_4e = total4e;
    this.available_slots_4e = total4e;
    this.total_slots_2e = total2e;
    this.available_slots_2e = total2e;
    this.total_slots_2p = total2p;
    this.available_slots_2p = total2p;
    this.total_slots_4p = total4p;
    this.available_slots_4p = total4p;

    const saved = Store.loadSlots();
    if (saved) Object.assign(this, saved);
  }

  persist() {
    Store.saveSlots({
      available_slots_4e: this.available_slots_4e,
      available_slots_2e: this.available_slots_2e,
      available_slots_2p: this.available_slots_2p,
      available_slots_4p: this.available_slots_4p,
      total_slots_4e: this.total_slots_4e,
      total_slots_2e: this.total_slots_2e,
      total_slots_2p: this.total_slots_2p,
      total_slots_4p: this.total_slots_4p,
    });
  }

  splitLine(line, delimiter) {
    return line.split(delimiter);
  }

  removeVehicleData(plate) {
    const lines = Store.loadDB();
    const kept = lines.filter((line) => !line.includes(plate));
    Store.saveDB(kept);
  }

  retrieveVehicleByPlate(plate) {
    const lines = Store.loadDB();
    let numberPlate = '';
    for (const line of lines) {
      if (line.includes(plate)) {
        const data = this.splitLine(line, ',');
        numberPlate = data[3]; // 4th column, same assumption as the C++
        break;
      }
    }
    return numberPlate;
  }

  // Reads back the full parked record (wheels/type/floor/entry time) for a
  // plate. The web edition uses this on exit so the correct garage slot is
  // freed and the bill reflects the actual parking duration — the original
  // C++ case 2 handler never re-reads these fields from the CSV row, which
  // is why releaseSlot() and calculateBill() end up operating on defaults.
  retrieveRecordByPlate(plate) {
    const lines = Store.loadDB();
    for (const line of lines) {
      if (line.includes(plate)) {
        const [wheels, type, floor, plateField, ...rest] = this.splitLine(line, ',');
        return {
          wheels: parseInt(wheels, 10),
          type: parseInt(type, 10),
          floor: parseInt(floor, 10),
          plate: plateField,
          entryTimeStr: rest.join(','),
        };
      }
    }
    return null;
  }

  hasAvailableSlot(wheels, type) {
    if (wheels === 1 && type === 1) return this.available_slots_2e > 0;
    if (wheels === 1 && type === 2) return this.available_slots_2p > 0;
    if (wheels === 2 && type === 1) return this.available_slots_4e > 0;
    if (wheels === 2 && type === 2) return this.available_slots_4p > 0;
    return false;
  }

  assignSlot(wheels, type) {
    if (this.hasAvailableSlot(wheels, type)) {
      if (wheels === 1 && type === 1) this.available_slots_2e--;
      else if (wheels === 1 && type === 2) this.available_slots_2p--;
      else if (wheels === 2 && type === 1) this.available_slots_4e--;
      else this.available_slots_4p--;
      this.persist();
      return true;
    }
    return false;
  }

  releaseSlot(wheels, type) {
    if (wheels === 1 && type === 1) this.available_slots_2e++;
    else if (wheels === 1 && type === 2) this.available_slots_2p++;
    else if (wheels === 2 && type === 1) this.available_slots_4e++;
    else this.available_slots_4p++; // same fallthrough as the original else branch
    this.persist();
  }
}

// ---------- VIP registry ----------
//
// Fixed to actually support tiers: each viplist line is now `uid,tier`
// (registered by an admin via case 5) instead of a bare UID, so checkout
// can look up the member's real tier instead of letting the customer
// self-report an unverified one.

function addVipMember(uid, tier) {
  const vip = Store.loadVip().filter((line) => line.split(',')[0].trim() !== uid.trim());
  vip.push(`${uid},${tier}`);
  Store.saveVip(vip);
}

function retrieveVipTier(uid) {
  const lines = Store.loadVip();
  for (const line of lines) {
    const [storedUid, tier] = line.split(',');
    if (storedUid && storedUid.trim() === uid.trim()) {
      return (tier || '').trim();
    }
  }
  return '';
}
