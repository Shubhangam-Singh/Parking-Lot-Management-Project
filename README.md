# Parking Management System 🚗
This is a comprehensive command-line parking management system built in C++. It effectively simulates a real-world parking facility, handling vehicle check-ins, check-outs, and dynamic billing. The project is designed with a strong emphasis on Object-Oriented Programming (OOP), using inheritance and polymorphism to manage different vehicle types and customer tiers.

# ✨ Key Features
## Dynamic Billing System:

Calculates parking fees based on the duration of the stay.

Features a VIP membership system (Silver, Gold, Platinum) that applies percentage-based discounts to the final bill.

## Vehicle & Slot Management:

Handles parking and retrieval for different vehicle categories (e.g., 2-wheelers vs. 4-wheelers, electric vs. petrol).

Tracks available parking slots for each vehicle category and assigns vehicles to appropriate floors.

## Data Persistence:

Uses CSV files (database.csv, viplist.txt) to store persistent data about parked vehicles and registered VIP members.

Vehicle records are automatically added upon entry and removed upon exit.

## Password-Protected Admin Panel:

Secure functions for administrative tasks.

Admins can view the entire parking database.

Admins can erase all records from the database.

Admins can add new Unique IDs (UIDs) to the VIP list.

## Robust Input Validation:

Includes error handling for user inputs, including menu choices and number plate format validation, to ensure a smooth user experience.

# 🛠️ Technologies Used
C++: The core programming language for the application logic.

## Standard Libraries:

<iostream> for console input/output.

<fstream> for file handling (CSV database).

<vector>, <string>, <sstream> for data manipulation.

<time.h> for calculating parking duration.

# 🚀 How to Compile and Run
Prerequisites: You need a C++ compiler, such as g++, installed on your system.

Compile the Code: Open your terminal, navigate to the project directory, and run the following command to compile the source file (assuming it's named main.cpp):

```Bash

g++ main.cpp -o parking_system
```
Required Files: Before running, make sure two empty files named database.csv and viplist.txt exist in the same directory as the executable.

Run the Program: Execute the compiled program with the following command:

```Bash

./parking_system
```
# 📋 How to Use

Upon running the application, you will be presented with a main menu.

Choose Option 1 to park a new vehicle by providing its details.

Choose Option 2 to retrieve a vehicle and generate its bill. You will be asked if you are a VIP to apply relevant discounts.

Admin functions (Options 3, 4, 5) are password-protected.

### View Database: galahad
### Erase Database: lancelot
### Update VIP List: merlin




