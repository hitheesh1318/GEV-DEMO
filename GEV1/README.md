# GE-Vernona Employee Management System

A production-ready real-time employee management system with attendance tracking, attrition monitoring, and a comprehensive dashboard.

## Features

✅ **Employee Management**
- Register new employees
- Update employee details
- Delete employee records
- Real-time directory with search

✅ **Attendance Tracking**
- Mark daily attendance
- View attendance reports
- Support for multiple statuses (Present, UPL, SL, Left)
- Date range reports

✅ **Attrition Monitoring**
- Record employee attritions
- Track attrition metrics
- Headcount calculations

✅ **Role-Based Access Control**
- WFM (Workforce Management) - Full access
- Team Lead (TL) - Team-specific view
- Different dashboards per role

✅ **Real-Time Dashboard**
- Live attendance updates
- Headcount metrics
- Shrinkage calculations
- Data export (Excel, CSV, PDF)

## Project Structure

```
GEV1/
├── src/
│   ├── server.js                 # Main Express server (OPTIMIZED)
│   ├── config/
│   │   └── db.js               # MongoDB connection configuration
│   ├── models/
│   │   ├── employee.js         # Employee Mongoose schema
│   │   ├── attendance.js       # Attendance Mongoose schema
│   │   └── attrition.js        # Attrition Mongoose schema
│   ├── routes/
│   │   ├── employees.js        # Employee API endpoints
│   │   ├── attendance.js       # Attendance API endpoints
│   │   └── attrition.js        # Attrition API endpoints
│   └── middleware/
│       └── errorHandler.js     # Centralized error handling
├── public/
│   ├── index.html              # Main dashboard
│   ├── Registration.html       # Employee registration form
│   ├── directory.html          # Employee directory
│   ├── script.js               # Dashboard JavaScript
│   ├── reg_script.js           # Registration form JavaScript
│   ├── styles.css              # Main styles
│   ├── reg_style.css           # Registration styles
│   └── postman/                # Postman API collection
├── .env                        # Environment variables (not committed)
├── .env.example               # Example environment file
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm (v6+)
- MongoDB instance (local or cloud)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd GEV1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your MongoDB URI and PORT
   ```

4. **Start the server**
   ```bash
   npm start
   # For development with auto-reload:
   npm run dev
   ```

5. **Access the application**
   - Dashboard: http://localhost:3000
   - API Health: http://localhost:3000/health

## API Endpoints

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:empId` - Get specific employee
- `POST /api/employees` - Register new employee
- `PUT /api/employees/:empId` - Update employee
- `DELETE /api/employees/:empId` - Delete employee

### Attendance
- `GET /api/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD` - Get attendance records
- `POST /api/attendance` - Mark attendance

### Attrition
- `GET /api/attrition` - Get attrition records
- `POST /api/attrition` - Record attrition

## Recent Optimizations (v2.0)

✅ **Fixed Mongoose Deprecation Warnings**
- Replaced `new: true` with `returnDocument: 'after'`

✅ **Code Organization**
- Separated concerns into models, routes, middleware
- Configuration management in separate files
- Modular architecture for scalability

✅ **Enhanced Error Handling**
- Centralized error handler middleware
- Validation error responses
- Duplicate entry detection

✅ **Production-Ready**
- Graceful shutdown handling
- Health check endpoint
- Proper CORS configuration
- Environment-based configuration

## Database Schema

### Employee
```javascript
{
  empId, empName, status, bgvStatus, level, teamLead, tlCode,
  sme, role, doj, hireDate, infyTenure, gevDoj, gevTenure,
  lastDoj, mobile, secondaryMobile, emergencyContact,
  presentAddress, area, routeNo, domain, infyId, assetTag,
  laptopReceived, domainExp, infyExp, overallExp, passport,
  submittedAt, timestamps
}
```

### Attendance
```javascript
{
  empId, date, status, timestamps
  // unique index on empId + date
}
```

### Attrition
```javascript
{
  empId, date, timestamps
}
```

## Troubleshooting

### Empty Directory
- Ensure employees exist in the database
- Check browser console for errors
- Verify API is returning data: `http://localhost:3000/api/employees`

### Mongoose Warnings
- All deprecation warnings have been fixed in v2.0
- Update to latest code from `src/server.js`

### Connection Issues
- Verify MongoDB URI in `.env`
- Check MongoDB is running and accessible
- Review server logs for error messages

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Commit with clear messages
5. Push to repository

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, contact the GE-Vernona team.
