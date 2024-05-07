#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>
#include <time.h>
#include <vector>
using namespace std;

// Base class for Vehicles
class Vehicle
{
protected:
    int vehicle_wheels;    // No of wheels: 1 for 2 wheeler, 2 for 4 wheeler
    int vehicle_type;      // Type of vehicle: 1 for electric, 2 for petrol
    int floor_finder_no;   // 11-2e 12-2p 21-4e 22-4p
    char number_plate[15]; // Number plate of vehicle

public:
    Vehicle() {}
    // Constructor to initialize vehicle parameters
    Vehicle(int wheels, int type, int floor_no, const char *plate)
        : vehicle_wheels(wheels), vehicle_type(type), floor_finder_no(floor_no)
    {
        strcpy(number_plate, plate);
    }

    // Virtual function for calculating bill
    virtual int calculateBill(time_t exit_time)
    {
        // To be overriden by derived class
        return 0;
    }

    //  member function to access the numberplate
    const char *getNumberPlate() const { return number_plate; }
    //  member function for accessing the vehicle type and number of wheels
    int getWheels() const { return vehicle_wheels; }
    int getType() const { return vehicle_type; }
};

class Customer : public Vehicle
{

protected:
    time_t entry_time;  // Initialization of entry time
    time_t exit_time;   // Initialization of exit time
    char vip_input[10]; // Stores the VIP type if the customer is VIP

public:
    Customer() {}
    // Constructor to initialize customer vehicle with entry time
    Customer(int wheels, int type, int floor_no, const char *plate,
             time_t entry_time)
        : Vehicle(wheels, type, floor_no, plate), entry_time(entry_time)
    {
        cout << "" << endl;
    }
    char vip_type[10];

public:
    vector<string> split(const string &line, char delimiter)
    {
        vector<string> result; // Stores the split substrings
        stringstream ss(line); // Create a stringstream from the input line
        string token;          // Stores each extracted token

        while (getline(ss, token, delimiter))
        {
            result.push_back(token); // Add the token to the result vector
        }

        return result;
    }
    string retrieveUID(const char *uid)
    {
        ifstream file("viplist.txt");
        string line;
        string UID;

        while (getline(file, line))
        {
            if (line.find(uid) != string::npos)
            {
                // Found the vehicle. extract  the number plate
                vector<string> data = split(line, '\n');
                UID = data[0]; // Assuming the number plate is the 4th column
                break;
            }
        }
        file.close();
        return UID;
    }
    void callifVIP()
    {

        // Loop until the user provides a valid input (either "yes" or "no")
        while (true)
        {
            cout << " _________________________________________________" << endl;
            cout << "|                                                 |\n";
            cout << "|               Are you a VIP? (yes/no)           |" << endl;
            cout << "|_________________________________________________|" << endl;
            cout << "Your answer: ";
            cin >> vip_input;
            strcpy(vip_type, "no");
            // Check if the input is either "yes" or "no"
            if (strcmp(vip_input, "yes") == 0)
            {
                char UID[10];
                cout << "Please enter your UID : ";
                cin >> UID;
                string id = retrieveUID(UID);
                if (id.empty())
                {
                    cout << "Sorry, but we cand find your ID in our database, you can "
                            "take our vip subscription if you like our services "
                         << endl;
                    break;
                }
                else
                {

                    cout << "Enter VIP type (silver/gold/platinum): " << endl;
                    cout << "Please enter type according to your membership only otherwise your membership can be cancelled (Non-refundable) " << endl;
                    cin >> vip_type;
                    // Check if the VIP type is valid
                    if (strcmp(vip_type, "silver") == 0 ||
                        strcmp(vip_type, "gold") == 0 ||
                        strcmp(vip_type, "platinum") == 0)
                    {

                        break; // Exit the loop if input is valid
                    }
                    else
                    {
                        cout << "Error: Invalid VIP type. Please enter 'silver', 'gold', "
                                "or 'platinum'."
                             << endl;
                    }
                }
            }
            else if (strcmp(vip_input, "no") == 0)
            {
                cout << "I hope you liked our services, you can get our membership to "
                        "avail amazing discounts and exciting offers "
                     << endl;
                break; // Exit the loop if input is valid
            }
            else
            {
                cout << "Error: Invalid input. Please enter 'yes' or 'no'." << endl;
            }
        }
    }

    // function for exit time initialization
    void setExitTime(time_t exitTime) { exit_time = exitTime; }

    // Override the virtual function for calculating bill
    int calculateBill(time_t exit_time) override
    {
        int timeDiff = difftime(exit_time, entry_time);
        int hours = timeDiff / 3600; // Calculate hours
        int remainingMinutes =
            (timeDiff % 3600) / 60; // Calculate minutes after hours removed

        // Display details and calculate the bill
        cout << "\n*Parking Lot Billing System*\n";
        cout << "Vehicle Number Plate: " << getNumberPlate() << endl;
        cout << "Exit Time:            " << ctime(&exit_time);
        cout << "Total Time:           " << hours / 100000 << " hours "
             << remainingMinutes << " minutes\n";
        int bill = (hours) / 10000;
        return bill;
    }
    int calculateBill(time_t exit_time, string vip_type)
    {
        int bill = calculateBill(exit_time);

        while (vip_type != "silver" && vip_type != "gold" &&
               vip_type != "platinum")
        {
            cout << "Error: Invalid VIP type. Please enter 'silver', 'gold', or "
                    "'platinum': ";
            cin >> vip_type;
        }

        if (vip_type == "silver")
        {
            bill -= bill * 0.1; // 10% discount for silver VIP
        }
        else if (vip_type == "gold")
        {
            bill -= bill * 0.15; // 15% discount for gold VIP
        }
        else if (vip_type == "platinum")
        {
            bill -= bill * 0.2; // 20% discount for platinum VIP
        }

        return bill;
    }
};

// Parking Lot class
class ParkingLot
{
public:
    int total_slots_4e; // 4 wheeler electric
    int available_slots_4e;
    int total_slots_2e; // 2 wheeler electric
    int available_slots_2e;
    int total_slots_2p; // 2 wheeler electric
    int available_slots_2p;
    int total_slots_4p; // 4 wheeler petrol
    int available_slots_4p;

    // Constructor to initialize parking lot slots
    ParkingLot(int total_4e, int total_2e, int total_2p, int total_4p)
        : total_slots_4e(total_4e), available_slots_4e(total_4e),
          total_slots_2e(total_2e), available_slots_2e(total_2e),
          total_slots_2p(total_2p), available_slots_2p(total_2p),
          total_slots_4p(total_4p), available_slots_4p(total_4p) {}

    // Function to remove vehicle data from database
    void removeVehicleData(const char *plate)
    {
        vector<string> csvData; // Create a vector to store lines from the CSV,
                                // excluding the one with the matching plate

        ifstream file("database.csv"); // Open the CSV file for reading
        string line;

        while (getline(file, line)) // Loop to read the CSV file line by line
        {
            if (line.find(plate) ==
                string::npos) // Check if the 'plate' is NOT found in the current line
            {
                // If the plate is not in this line, we want to keep it:
                csvData.push_back(line); // Add the current line to the 'csvData' vector
            }
            // Otherwise (if the plate is found), the line is skipped and not added to
            // 'csvData'
        }
        file.close(); // close the file

        // Overwrite the CSV file
        ofstream outfile("database.csv");
        for (const string &line : csvData)
        {
            outfile << line << endl;
        }
        outfile.close();
    }

    // Function to split a string by delimiter
    vector<string> split(const string &line, char delimiter)
    {
        vector<string> result; // Stores the split substrings
        stringstream ss(line); // Create a stringstream from the input line
        string token;          // Stores each extracted token

        while (getline(ss, token, delimiter))
        {
            result.push_back(token); // Add the token to the result vector
        }

        return result;
    }

    // Retrieving of vehicle details from the database
    string retrieveVehicleByPlate(const char *plate)
    {
        ifstream file("database.csv");
        string line;
        string numberPlate;

        while (getline(file, line))
        {
            if (line.find(plate) != string::npos)
            {
                // Found the vehicle. extract  the number plate
                vector<string> data = split(line, ',');
                numberPlate = data[3]; // Assuming the number plate is the 4th column
                break;
            }
        }
        file.close();
        return numberPlate;
    }

    // Function to check if a specific slot type has available space for parking
    bool hasAvailableSlot(int vehicle_wheels, int vehicle_type)
    {
        if (vehicle_wheels == 1 && vehicle_type == 1)
        {
            return available_slots_2e > 0;
        }
        else if (vehicle_wheels == 1 && vehicle_type == 2)
        {
            return available_slots_2p > 0;
        }
        else if (vehicle_wheels == 2 && vehicle_type == 1)
        {
            return available_slots_4e > 0;
        }
        else if (vehicle_wheels == 2 && vehicle_type == 2)
        {
            return available_slots_4p > 0;
        }
        else
        {
            // Invalid vehicle type or wheels
            return false;
        }
    }

    // Function to assign a slot (and simultaneously reduce available slots) based
    // on the vehicle type of customer
    void assignSlot(int vehicle_wheels, int vehicle_type)
    {
        // Check if there are available slots for the given vehicle type and wheels
        if (hasAvailableSlot(vehicle_wheels, vehicle_type))
        {
            if (vehicle_wheels == 1 && vehicle_type == 1)
            {
                available_slots_2e--;
            }
            else if (vehicle_wheels == 1 && vehicle_type == 2)
            {
                available_slots_2p--;
            }
            else if (vehicle_wheels == 2 && vehicle_type == 1)
            {
                available_slots_4e--;
            }
            else
            {
                available_slots_4p--;
            }

            cout << "";
        }
        else
        {
            cout << "Error: No available slot for this vehicle type." << endl;
        }
    }

    // Function to release a slot (and simultaneously increase available slots)
    // based on the vehicle type of customer
    void releaseSlot(int vehicle_wheels, int vehicle_type)
    {
        if (vehicle_wheels == 1 && vehicle_type == 1)
        {
            available_slots_2e++;
        }
        else if (vehicle_wheels == 1 && vehicle_type == 2)
        {
            available_slots_2p++;
        }
        else if (vehicle_wheels == 2 && vehicle_type == 1)
        {
            available_slots_4e++;
        }
        else
        {
            available_slots_4p++;
        }

        cout << "Slot released successfully." << endl;
    }
};
int main()
{
    // Create the ParkingLot object
    ParkingLot parkingLot(30, 30, 30, 30); // assigning all the slot values to 30
    fstream fobj;
    // opening modes are derived from ios base class
    fobj.open("database.csv", ios ::in | ios ::out | ios::app);
    fstream obj;
    obj.open("viplist.txt", ios ::in | ios ::out | ios::app);
    while (true)
    {
        int choice;
        cout << "\n";
        cout << "  _____           _      ______                " << endl;
        cout << " |  __ \\         | |    |  ____|               " << endl;
        cout << " | |__) |_ _ _ __| | __ | |__   __ _ ___ _   _ " << endl;
        cout << " |  ___/ _` | '__| |/ / |  __| / _` / __| | | |" << endl;
        cout << " | |  | (_| | |  |   <  | |___| (_| \\__ \\ |_| |" << endl;
        cout << " |_|   \\__,_|_|  |_|\\_\\ |______\\__,_|___/\\__, |" << endl;
        cout << "                                          __/ |" << endl;
        cout << "                                         |___/ " << endl;
        cout << endl;
        // Parking Lot Menu  and options
        cout << " _________________________________________________" << endl;
        cout << "| Parking Lot Menu:                               |\n";
        cout << "| 1. Park a vehicle                               |\n";
        cout << "| 2. Retrieve a vehicle                           |\n";
        cout << "| 3. View The Database(Only for Admins)           |\n";
        cout << "| 4. Erase the database (Only for Admins)         |\n";
        cout << "| 5. Update The Unique ID List                    |\n";
        cout << "| 6. Exit Parking Lot System                      |\n";
        cout << "|_________________________________________________|" << endl;
        cout << "Enter your choice:";

        cin >> choice; // Input choice from the user

        switch (choice)
        {
        case 1: // Parking a vehicle
        {
            // Getting details from the user
            int wheels, type, floor_no;
            char plate[15];
            bool valid;
            cout << "Enter vehicle details:\n";

            // do-while loop until the user inputs correct information for wheels
            do
            {
                cout << " _________________________________________________" << endl;
                cout << "|                                                 |\n";
                cout << "|             Press 1 for 2-wheeler               |" << endl;
                cout << "|             Press 2 for 4-wheeler               |" << endl;
                cout << "|_________________________________________________|" << endl;
                cout << "Enter wheels type: ";
                cin >> wheels;
                if (wheels != 1 && wheels != 2)
                {
                    cout << "Error: Invalid input. Please enter 1 or 2." << endl;
                    cin.clear();
                    cin.ignore(10000, '\n');
                }
            } while (wheels != 1 && wheels != 2);

            // do-while loop until the user inputs correct information for type

            do
            {
                cout << " _________________________________________________" << endl;
                cout << "|                                                 |\n";
                cout << "|             Press 1 for Electric                |" << endl;
                cout << "|             Press 2 for Petrol                  |" << endl;
                cout << "|_________________________________________________|" << endl;
                cout << "Enter fuel type: ";
                cin >> type;
                if (type != 1 && type != 2)
                {
                    cout << "Error: Invalid input. Please enter 1 or 2." << endl;
                    cin.clear();
                    cin.ignore(10000, '\n');
                }
            } while (type != 1 && type != 2);

            // Automatically assign floor based on wheels and type
            if (wheels == 1 && type == 1)
                floor_no = 1;
            else if (wheels == 1 && type == 2)
                floor_no = 2;
            else if (wheels == 2 && type == 1)
                floor_no = 3;
            else if (wheels == 2 && type == 2)
                floor_no = 4;

            // do-while loop until the user inputs correct information for number
            // plate validation

            do
            {
                // Clear input buffer before reading number plate
                cin.clear();
                cin.ignore(10000, '\n');

                cout << " _________________________________________________" << endl;
                cout << "|                                                 |\n";
                cout << "|             Format :LLDDLLDDDD                  |" << endl;
                cout << "|             Example: TN21DF9967                 |" << endl;
                cout << "|_________________________________________________|" << endl;
                cout << "Enter Number Plate" << endl;
                cin.getline(plate, sizeof(plate));

                valid = true;
                if (strlen(plate) != 10)
                {
                    valid = false;
                }
                else
                {
                    // for loop to check each character of the number plate
                    for (int i = 0; i < 10; i++)
                    {
                        // checking for digits in the number plate format
                        if (i == 2 || i == 3 || i == 6 || i == 7 || i == 8 || i == 9)
                        {
                            if (!isdigit(plate[i]))
                            {
                                valid = false;
                                break;
                            }
                        }
                        else
                        {
                            if (!isupper(plate[i]))
                            {
                                valid = false;
                                break;
                            }
                        }
                    }
                }

                if (!valid)
                {
                    cout << "Error: Invalid number plate format. Please enter in format "
                            "LLDDLLDDDD (Example: MH12AB3456) \nNow press Enter to "
                            "continue Enter ";
                }
                else
                {
                    cout << " ___________________________________________________________"
                            "______________"
                         << endl;
                    cout << "|                                            |              "
                            "              |\n";
                    cout << "|  Vehicle has been parked at floor number:  |              "
                            "     "
                         << floor_no << "        |" << endl;
                    cout << "|____________________________________________|______________"
                            "______________|"
                         << endl;
                    cout << "|                                            |              "
                            "              |";
                }
            } while (!valid);
            time_t entry_time = time(0); // initialization of vehicle entry time

            // storing in the database
            fobj << wheels << "," << type << "," << floor_no << "," << plate << ","
                 << ctime(&entry_time) << endl;

            // Create Customer object in order to park the vehicle

            Customer customer(wheels, type, floor_no, plate, entry_time);
            if (parkingLot.hasAvailableSlot(customer.getWheels(),
                                            customer.getType()))
            {
                parkingLot.assignSlot(customer.getWheels(), customer.getType());
                cout << "|  Vehicle parked successfully at time:      |  "
                     << ctime(&entry_time) << endl;
                cout << "|____________________________________________|________________"
                        "____________|"
                     << endl;
            }
            else
            {
                cout << "Error: No available slot for this vehicle type. " << endl;
            }
            break;
        }
        case 2: // Retrieving a vehicle
                // Get vehicle details from the user
                // Retrieve the vehicle, calculate parking fee, and release the slot
        {
            int wheels = 0, type = 0, floor_no = 0;
            char plate2[15];
            cout << "Enter vehicle details:\n";
            cout << " _________________________________________________" << endl;
            cout << "|                                                 |\n";
            cout << "|              Enter vehicle details              |" << endl;
            cout << "|_________________________________________________|" << endl;
            cout << "Number plate: ";
            cin.ignore();
            cin.getline(plate2, sizeof(plate2)); // number plate input
            // customer object to retrieve the vehicle details
            Customer customer(wheels, type, floor_no, plate2, 0);

            // Use the created Customer object for further processing
            string numberPlateFromCSV = parkingLot.retrieveVehicleByPlate(plate2);

            if (numberPlateFromCSV
                    .empty())
            { // searching of the input vehicle number plate
                cout << "Vehicle not found." << endl;
            }
            else
            {
                cout << "Vehicle successfully identified." << endl;
                class Customer vipcheck;
                vipcheck.callifVIP();
                string finalvipcheck = vipcheck.vip_type;

                time_t exit_time = time(0);      // exit time initalised
                customer.setExitTime(exit_time); // Record exit time
                int bill;
                if (finalvipcheck == "no")
                {
                    // bill calculation according to exit time of vehicle
                    bill = customer.calculateBill(exit_time);
                }
                else
                {
                    bill = customer.calculateBill(exit_time, finalvipcheck);
                }

                // retrieving of vehicle deatils for successful exiting
                parkingLot.retrieveVehicleByPlate(plate2);

                // removing the vehicle deatils from the database
                parkingLot.removeVehicleData(plate2);

                // removing the vehicle from the assigned slot
                parkingLot.releaseSlot(customer.getWheels(), customer.getType());

                cout << "Parking Fee:          Rs. " << bill << endl;

                cout << "Have a nice day!" << endl;
            }
            break;
        }

        case 3:
            // View the database(by admins only)
            //  View database codename : galahad
            {
                string pass;
                cout << " _________________________________________________" << endl;
                cout << "|                                                 |\n";
                cout << "|            Enter password to proceed            |" << endl;
                cout << "|_________________________________________________|" << endl;
                cout << "Password:  ";
                cin >> pass; // input to view database
                if (pass.compare("galahad") ==
                    0)
                { // comparison of input and original codename

                    if (fobj.fail())
                    { // if comparison returns true
                        cerr << "Unable to open the file " << endl;
                        return 1;
                    }
                    else
                    {
                        cout << "Here are the details " << endl;
                    }
                    // Reset the file pointer to the beginning
                    fobj.seekg(0, ios::beg);
                    // Here we will do a while loop to move cursor in file to end of the
                    // file for copying data and storing it
                    while (fobj.peek() != EOF)
                    {
                        string records;
                        getline(fobj, records, ',');
                        cout << records << endl; // printing records with a new line on
                                                 // encountering a comma(,)
                    }
                }
                else
                { // if comparison returns false
                    cout << "Wrong password" << endl;
                }
                break;
            }
        case 4:
            // Erasing the database(by admins only)
            //  Erase database Codename : lancelot
            {
                string pass;
                cout << " _________________________________________________" << endl;
                cout << "|                                                 |\n";
                cout << "|            Enter password to proceed            |" << endl;
                cout << "|_________________________________________________|" << endl;
                cout << "Password:  ";
                cin >> pass; // codename input
                if (pass.compare("lancelot") ==
                    0)
                { // comparing the input with the original codename
                    if (fobj.fail())
                    { // if the comparison is true
                        cerr << "Unable to open the file " << endl;
                        return 1;
                    }
                    else
                    {
                        cout << "Are you sure you want to erase the entire database? "
                                "(yes/no): ";
                        string confirmation;
                        cin >> confirmation;

                        if (confirmation == "yes")
                        {
                            // Open the CSV file in truncation mode
                            ofstream outfile("database.csv", ios::out | ios::trunc);
                            outfile.close(); // Close the file immediately
                            cout << "Database erased." << endl;
                        }
                        else
                        {
                            cout << "Database erase operation canceled." << endl;
                        }
                    }
                }
                else
                { // if the comparison returns false
                    cout << "Wrong password" << endl;
                }

                break;
            }
        case 5:
            // Case to input Unique IDs
            // Codename : merlin
            {
                string pass;
                cout << "Password:  ";
                cin >> pass; // input to view database
                if (pass.compare("merlin") == 0)
                {
                    int n;
                    cout << "How many UID's you want to store :";
                    cin >> n;
                    for (int x = 1; x <= n; x++)
                    {
                        char uid[10];
                        cout << "enter uid : ";
                        cin >> uid;
                        obj << uid << endl;
                    }
                }
                else
                {
                    cout << "Wrong password" << endl;
                }
                break;
            }
        case 6: // exit the system
        {
            cout << " _________________________________________________" << endl;
            cout << "|                                                 |\n";
            cout << "|           Have a Safe drive Home ^_^            |" << endl;
            cout << "|_________________________________________________|" << endl;
            return 0;
            break;
        }

        default:
            cout << "Invalid choice. Please try again.\n";
            break;
        }
    }
    fobj.close();
    return 0;
}



