# KRI KPI Dashboard - Backend Administration

This backend includes a comprehensive database administration utility that consolidates all database management tasks.

## Quick Start

### Setup Database (Recommended)
```bash
npm run setup
```
This will:
- Create the database if it doesn't exist
- Create all required tables
- Add missing columns (like bio column)
- Seed the superadmin user

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Complete database setup (recommended) |
| `npm run test-db` | Test database connection with multiple configs |
| `npm run create-db` | Create database only |
| `npm run set-password` | Set MySQL root password to 'netweb' |
| `npm start` | Start the production server |
| `npm run dev` | Start the development server with nodemon |

### Manual Commands

You can also run the admin utility directly:

```bash
# Complete setup
node admin-utils.js setup

# Test connection
node admin-utils.js test

# Create database only
node admin-utils.js create-db

# Set MySQL password
node admin-utils.js set-password

# Show help
node admin-utils.js help
```

## Default Superadmin Credentials

After running the setup, you can log in with:
- **Email:** tyrone@netwebindia.com
- **Username:** tyrone
- **Password:** netweb@123

## Environment Configuration

The application uses different configurations based on `NODE_ENV`:

### Development (default)
- Host: `127.0.0.1:3306`
- Database: `kri_kpi_dashboard`
- User: `root`
- Password: Set via environment variables

### Production
- Uses production environment variables
- All settings configurable via `.env` file

## Database Schema

The setup creates the following tables:
- `departments` - Department management
- `users` - User accounts and profiles (includes bio field)
- `kras` - Key Responsibility Areas
- `daily_tasks` - Daily task management with escalation
- `faqs` - Frequently Asked Questions

## Troubleshooting

### Connection Issues
1. Run `npm run test-db` to test various connection configurations
2. Ensure MySQL is running
3. Check your `.env` file configuration

### Password Issues
1. Run `npm run set-password` to set MySQL root password to 'netweb'
2. Update your `.env` file accordingly
3. Restart MySQL service

### Missing Tables/Columns
Run `npm run setup` to ensure all tables and columns are created.

## Network Access

The server automatically detects and configures CORS for all network interfaces:
- Local: `http://localhost:5000`
- Network: `http://[your-ip]:5000`

The frontend can connect from any detected network interface.