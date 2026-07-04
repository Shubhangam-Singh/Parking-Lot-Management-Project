/*
 * Menu loop — a straight port of main()'s switch/case in
 * "Parking-Lot-Management (Park Easy).cpp". Same six options, same
 * prompts, same validation rules, same admin codenames (galahad /
 * lancelot / merlin), same billing formulas. This file only decides
 * *how* to ask/print (via Terminal) and layers gamification (XP,
 * badges, garage animation, receipts) on top of the unchanged logic.
 */

const BANNER = [
  '  _____           _      ______                ',
  ' |  __ \\         | |    |  ____|               ',
  ' | |__) |_ _ _ __| | __ | |__   __ _ ___ _   _ ',
  ' |  ___/ _` | \'__| |/ / |  __| / _` / __| | | |',
  ' | |  | (_| | |  |   <  | |___| (_| \\__ \\ |_| |',
  ' |_|   \\__,_|_|  |_|\\_\\ |______\\__,_|___/\\__, |',
  '                                          __/ |',
  '                                         |___/ ',
];

const MENU_BOX = [
  ' _________________________________________________',
  '| Parking Lot Menu:                               |',
  '| 1. Park a vehicle                               |',
  '| 2. Retrieve a vehicle                           |',
  '| 3. View The Database(Only for Admins)           |',
  '| 4. Erase the database (Only for Admins)         |',
  '| 5. Update The Unique ID List                    |',
  '| 6. Exit Parking Lot System                      |',
  '|_________________________________________________|',
];

const WHEELS_BOX = [
  ' _________________________________________________',
  '|                                                 |',
  '|             Press 1 for 2-wheeler               |',
  '|             Press 2 for 4-wheeler               |',
  '|_________________________________________________|',
];

const FUEL_BOX = [
  ' _________________________________________________',
  '|                                                 |',
  '|             Press 1 for Electric                |',
  '|             Press 2 for Petrol                  |',
  '|_________________________________________________|',
];

const PLATE_BOX = [
  ' _________________________________________________',
  '|                                                 |',
  '|             Format :LLDDLLDDDD                  |',
  '|             Example: TN21DF9967                 |',
  '|_________________________________________________|',
];

const VIP_BOX = [
  ' _________________________________________________',
  '|                                                 |',
  '|               Are you a VIP? (yes/no)           |',
  '|_________________________________________________|',
];

const RETRIEVE_BOX = [
  ' _________________________________________________',
  '|                                                 |',
  '|              Enter vehicle details              |',
  '|_________________________________________________|',
];

const PASSWORD_BOX = [
  ' _________________________________________________',
  '|                                                 |',
  '|            Enter password to proceed            |',
  '|_________________________________________________|',
];

const EXIT_BOX = [
  ' _________________________________________________',
  '|                                                 |',
  '|           Have a Safe drive Home ^_^            |',
  '|_________________________________________________|',
];

let term, lot;

function ctimeStr(ms) {
  const d = new Date(ms);
  return d.toDateString() + ' ' + d.toLocaleTimeString('en-US', { hour12: false });
}

function isPlateValid(plate) {
  if (plate.length !== 10) return false;
  const digitPositions = new Set([2, 3, 6, 7, 8, 9]);
  for (let i = 0; i < 10; i++) {
    const ch = plate[i];
    if (digitPositions.has(i)) {
      if (!/[0-9]/.test(ch)) return false;
    } else if (!/[A-Z]/.test(ch)) {
      return false;
    }
  }
  return true;
}

function catKeyFor(wheels, type) {
  if (wheels === 1 && type === 1) return '2e';
  if (wheels === 1 && type === 2) return '2p';
  if (wheels === 2 && type === 1) return '4e';
  return '4p';
}

async function bootSequence() {
  const lines = [
    'BOOTING PARK EASY OS v3.0.0 ...',
    'MOUNTING localStorage:// as /database.csv',
    'MOUNTING localStorage:// as /viplist.txt',
    'CALIBRATING GARAGE SENSORS ...',
    'LINKING PARKING LOT ENGINE ...',
  ];
  for (const l of lines) {
    await term.type(l, 'boot', 8);
    await sleep(90);
  }
  const bar = term.println('[' + '░'.repeat(30) + '] 0%', 'boot');
  for (let p = 0; p <= 100; p += 4) {
    const filled = Math.round((p / 100) * 30);
    bar.textContent = '[' + '█'.repeat(filled) + '░'.repeat(30 - filled) + `] ${p}%`;
    await sleep(18);
  }
  term.println('', '');
  Sound.engineStart();
  await term.type('SYSTEM READY.', 'boot-ready', 14);
  term.println('', '');
  await sleep(150);
  term.printBox(BANNER, 'banner');
  term.println('', '');
}

async function askYesNoLoop(question, yesMsg, noMsg) {
  while (true) {
    term.printBox(VIP_BOX, 'box');
    const answer = (await term.ask('Your answer (yes/no):')).trim();
    if (answer === 'yes') return true;
    if (answer === 'no') {
      term.println(noMsg);
      return false;
    }
    term.println("Error: Invalid input. Please enter 'yes' or 'no'.", 'err');
  }
}

async function callIfVIP() {
  let vipType = 'no';
  while (true) {
    term.printBox(VIP_BOX, 'box');
    const answer = (await term.ask('Are you a VIP? (yes/no):')).trim();
    if (answer === 'yes') {
      const uid = (await term.ask('Please enter your UID:')).trim();
      const id = retrieveUID(uid);
      if (!id) {
        term.println(
          "Sorry, but we can't find your ID in our database, you can take our vip subscription if you like our services"
        );
        Sound.error();
        break;
      } else {
        term.println('Enter VIP type (silver/gold/platinum):');
        term.println(
          'Please enter type according to your membership only otherwise your membership can be cancelled (Non-refundable)'
        );
        const type = (await term.ask('VIP type:')).trim();
        if (['silver', 'gold', 'platinum'].includes(type)) {
          vipType = type;
          Stats.unlock('vip_verified');
          Sound.success();
          break;
        } else {
          term.println("Error: Invalid VIP type. Please enter 'silver', 'gold', or 'platinum'.", 'err');
        }
      }
    } else if (answer === 'no') {
      term.println(
        'I hope you liked our services, you can get our membership to avail amazing discounts and exciting offers'
      );
      break;
    } else {
      term.println("Error: Invalid input. Please enter 'yes' or 'no'.", 'err');
    }
  }
  return vipType;
}

async function caseParkVehicle() {
  term.println('Enter vehicle details:');

  let wheels;
  while (true) {
    term.printBox(WHEELS_BOX, 'box');
    wheels = await term.askInt('Enter wheels type:');
    if (wheels === 1 || wheels === 2) break;
    term.println('Error: Invalid input. Please enter 1 or 2.', 'err');
  }

  let type;
  while (true) {
    term.printBox(FUEL_BOX, 'box');
    type = await term.askInt('Enter fuel type:');
    if (type === 1 || type === 2) break;
    term.println('Error: Invalid input. Please enter 1 or 2.', 'err');
  }

  let floor_no;
  if (wheels === 1 && type === 1) floor_no = 1;
  else if (wheels === 1 && type === 2) floor_no = 2;
  else if (wheels === 2 && type === 1) floor_no = 3;
  else if (wheels === 2 && type === 2) floor_no = 4;

  let plate, valid;
  do {
    term.printBox(PLATE_BOX, 'box');
    plate = (await term.ask('Enter Number Plate:')).trim();
    valid = isPlateValid(plate);
    if (!valid) {
      term.println(
        'Error: Invalid number plate format. Please enter in format LLDDLLDDDD (Example: MH12AB3456)',
        'err'
      );
    } else {
      term.println(' _________________________________________________________________________');
      term.println(`|  Vehicle has been parked at floor number:  |                ${floor_no}        |`);
      term.println('|____________________________________________|_____________________________|');
    }
  } while (!valid);

  const entry_time = Date.now();
  const dbLine = `${wheels},${type},${floor_no},${plate},${ctimeStr(entry_time)}`;
  const db = Store.loadDB();
  db.push(dbLine);
  Store.saveDB(db);

  const customer = new Customer(wheels, type, floor_no, plate, entry_time);

  if (lot.hasAvailableSlot(customer.getWheels(), customer.getType())) {
    lot.assignSlot(customer.getWheels(), customer.getType());
    term.println(`|  Vehicle parked successfully at time:      |  ${ctimeStr(entry_time)}`);
    term.println('|____________________________________________|_____________________________|');
    Sound.success();
    Garage.driveIn(catKeyFor(wheels, type), wheels);
    Garage.render(lot);

    Stats.data.totalParked++;
    Stats.addXp(10);
    Stats.save();
    Stats.unlock('first_park');
    if (Stats.data.totalParked >= 10) Stats.unlock('ten_parked');
    if (!lot.hasAvailableSlot(customer.getWheels(), customer.getType())) Stats.unlock('full_house');
    if (new Date().getHours() < 4) Stats.unlock('night_owl');
    Stats.renderHud();
  } else {
    term.println('Error: No available slot for this vehicle type.', 'err');
    Sound.error();
  }
}

async function caseRetrieveVehicle() {
  term.println('Enter vehicle details:');
  term.printBox(RETRIEVE_BOX, 'box');
  const plate2 = (await term.ask('Number plate:')).trim();

  const record = lot.retrieveRecordByPlate(plate2);

  if (!record) {
    term.println('Vehicle not found.', 'err');
    Sound.error();
    return;
  }

  const parsedEntryTime = Date.parse(record.entryTimeStr);
  const customer = new Customer(
    record.wheels,
    record.type,
    record.floor,
    plate2,
    Number.isNaN(parsedEntryTime) ? 0 : parsedEntryTime
  );

  term.println('Vehicle successfully identified.');
  const finalVipCheck = await callIfVIP();

  const exit_time = Date.now();
  customer.setExitTime(exit_time);

  const detail = customer.calculateBill(exit_time);
  term.println('');
  term.println('*Parking Lot Billing System*');
  term.println('Vehicle Number Plate: ' + customer.getNumberPlate());
  term.println('Exit Time:            ' + ctimeStr(exit_time));
  term.println(`Total Time:           ${detail.displayHours} hours ${detail.remainingMinutes} minutes`);

  const bill = finalVipCheck === 'no' ? detail.bill : customer.calculateBillVip(exit_time, finalVipCheck);

  lot.retrieveVehicleByPlate(plate2);
  lot.removeVehicleData(plate2);
  lot.releaseSlot(customer.getWheels(), customer.getType());
  Garage.driveOut(catKeyFor(customer.getWheels(), customer.getType()), customer.getWheels());
  Garage.render(lot);

  printReceipt(document.getElementById('receiptDock'), {
    plate: customer.getNumberPlate(),
    hours: detail.displayHours,
    minutes: detail.remainingMinutes,
    vipType: finalVipCheck,
    bill,
  });

  term.println(`Parking Fee:          Rs. ${bill}`);
  term.println('Have a nice day!');

  Stats.data.totalRetrieved++;
  Stats.data.totalRevenue += bill;
  Stats.addXp(15);
  Stats.save();
  Stats.unlock('first_retrieve');
  Stats.renderHud();
}

async function caseViewDatabase() {
  term.printBox(PASSWORD_BOX, 'box');
  const pass = (await term.ask('Password:')).trim();
  if (pass !== 'galahad') {
    term.println('Wrong password', 'err');
    Sound.error();
    return;
  }
  Stats.unlock('admin_access');
  Sound.success();
  const lines = Store.loadDB();
  if (!lines.length) {
    term.println('(database is empty)');
    return;
  }
  term.println('Here are the details');
  term.println('WHEELS | TYPE | FLOOR | PLATE       | ENTRY TIME');
  lines.forEach((line) => {
    const [wheels, type, floor, plate, ...rest] = line.split(',');
    term.println(
      `${wheels.padEnd(6)} | ${type.padEnd(4)} | ${floor.padEnd(5)} | ${plate.padEnd(11)} | ${rest.join(',')}`
    );
  });
}

async function caseEraseDatabase() {
  term.printBox(PASSWORD_BOX, 'box');
  const pass = (await term.ask('Password:')).trim();
  if (pass !== 'lancelot') {
    term.println('Wrong password', 'err');
    Sound.error();
    return;
  }
  Stats.unlock('admin_access');
  const confirmation = (await term.ask('Are you sure you want to erase the entire database? (yes/no):')).trim();
  if (confirmation === 'yes') {
    Store.saveDB([]);
    term.println('Database erased.');
    Sound.success();
    Stats.unlock('database_wipe');
  } else {
    term.println('Database erase operation canceled.');
  }
}

async function caseUpdateUidList() {
  const pass = (await term.ask('Password:')).trim();
  if (pass !== 'merlin') {
    term.println('Wrong password', 'err');
    Sound.error();
    return;
  }
  Stats.unlock('admin_access');
  const n = await term.askInt("How many UID's you want to store:");
  const vip = Store.loadVip();
  for (let x = 1; x <= n; x++) {
    const uid = (await term.ask('enter uid:')).trim();
    vip.push(uid);
  }
  Store.saveVip(vip);
  Sound.success();
}

async function menuLoop() {
  while (true) {
    term.println('');
    term.printBox(BANNER, 'banner');
    term.println('');
    term.printBox(MENU_BOX, 'box');
    const choice = await term.askInt('Enter your choice:');

    switch (choice) {
      case 1:
        await caseParkVehicle();
        break;
      case 2:
        await caseRetrieveVehicle();
        break;
      case 3:
        await caseViewDatabase();
        break;
      case 4:
        await caseEraseDatabase();
        break;
      case 5:
        await caseUpdateUidList();
        break;
      case 6:
        term.printBox(EXIT_BOX, 'box');
        term.input.disabled = true;
        return;
      default:
        term.println('Invalid choice. Please try again.', 'err');
        Sound.error();
    }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  term = new Terminal(
    document.getElementById('scrollback'),
    document.getElementById('cmdInput'),
    document.getElementById('promptLabel')
  );
  lot = new ParkingLot(30, 30, 30, 30);

  Garage.mount(document.getElementById('garage'));
  Garage.render(lot);
  Stats.renderHud();

  const muteBtn = document.getElementById('muteBtn');
  muteBtn.textContent = Sound.muted ? '🔇' : '🔊';
  muteBtn.addEventListener('click', () => {
    muteBtn.textContent = Sound.toggleMute() ? '🔇' : '🔊';
  });

  await bootSequence();
  await menuLoop();
});
