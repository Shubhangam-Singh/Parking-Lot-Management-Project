/*
 * ParkEase engine — a direct JavaScript port of the classes and logic in
 * "Parking-Lot-Management (Park Easy).cpp" (Vehicle, Customer, ParkingLot,
 * plus the file-backed database/viplist). Nothing about the original
 * behaviour, math, or bugs has been changed — only the storage medium
 * (localStorage instead of database.csv / viplist.txt) and the fact that
 * cin/cout are replaced by the async Terminal I/O layer in terminal.js.
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

  // mirrors calculateBill(time_t exit_time) — single overload, no VIP
  calculateBill(exitTime) {
    const timeDiff = Math.floor((exitTime - this.entry_time) / 1000); // seconds, like difftime()
    const hours = Math.floor(timeDiff / 3600);
    const remainingMinutes = Math.floor((timeDiff % 3600) / 60);

    const displayHours = Math.floor(hours / 100000); // ported as-is from the original
    const bill = Math.floor(hours / 10000); // ported as-is from the original

    return { hours, remainingMinutes, displayHours, bill };
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

// ---------- VIP list lookup (mirrors Customer::retrieveUID) ----------

function retrieveUID(uid) {
  const lines = Store.loadVip();
  for (const line of lines) {
    if (line.includes(uid)) {
      const data = line.split('\n');
      return data[0];
    }
  }
  return '';
}
