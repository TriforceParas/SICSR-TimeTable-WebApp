# 📚 SICSR Timetable WebApp

A web application that replicates the functionality of an Android timetable app, allowing students to view their class schedules for SICSR (Shri Iyathurai Civil Service Institute of Research).

## Features

✨ **Core Features:**
- 📅 **Batch Selection** - Choose multiple batches to view their timetables
- 🗓️ **Date Navigation** - Jump to any date or navigate day by day
- 📊 **Course Display** - View all classes with room numbers and timings
- 💾 **Persistent Storage** - Selected batches are saved locally
- 🎨 **Responsive Design** - Works seamlessly on desktop and mobile devices
- ⚡ **Real-time Loading** - Fetches latest timetable data from SICSR API

## Project Structure

```
SICSR-TimeTable-WebApp/
├── index.html          # Main HTML structure
├── scripts/
│   └── script.js       # Core application logic
├── styles/
│   └── styles.css      # Styling and responsive design
├── assets/             # Images and static files
├── logo.png            # Favicon and app logo
└── README.md           # This file
```

## Technical Architecture

### Core Classes

1. **HttpClient** - HTTP request handler with CORS proxy support
   - Handles all API communications
   - Implements retry logic for failed requests
   - Uses AllOrigins API as CORS proxy

2. **TimetableManager** - Manages timetable data
   - Loads available batches from SICSR API
   - Fetches course information for selected batches
   - Parses CSV data from API responses
   - Manages localStorage for selected batches

3. **UIManager** - Handles all user interface logic
   - Initializes the application
   - Manages modals and date selection
   - Renders courses and batch selection UI
   - Handles user interactions and events

## Installation & Usage

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection to access SICSR API

### Steps to Run

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd SICSR-TimeTable-WebApp
   ```

2. **Open in browser**
   - Simply open `index.html` in your web browser
   - Or serve it using a local server:
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Node.js (with http-server)
     npx http-server
     ```

3. **Select Your Batches**
   - Click "Select Batches" button
   - Choose your batch(es)
   - Click "Save & Refresh"

4. **View Your Timetable**
   - Current day's classes appear automatically
   - Use navigation buttons to change dates
   - Use date picker for quick date jumping

## API Information

- **Base URL:** `http://time-table.sicsr.ac.in/report.php`
- **CORS Proxy:** `https://api.allorigins.win/raw?url=`
- **Data Format:** CSV with quoted fields
- **Response Fields:**
  - Room number
  - Course description
  - Start time (24-hour format)
  - End time (24-hour format)

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome  | ✅ Full |
| Firefox | ✅ Full |
| Safari  | ✅ Full |
| Edge    | ✅ Full |
| IE 11   | ❌ Not Supported |

## Features Explained

### Batch Selection
- Select one or multiple batches to view their combined timetable
- Selections are automatically saved to browser's localStorage
- No account or login required

### Date Navigation
- **Tomorrow/Yesterday Buttons** - Quick day-to-day navigation
- **Date Picker** - Jump to any specific date instantly
- **Current Date Display** - Shows formatted date with day of week

### Course Information
- **Course Name** - Full course/subject name
- **Room Number** - Classroom or lab location
- **Start Time** - Class start time in 12-hour format
- **End Time** - Class end time in 12-hour format

## Customization

### Changing Colors
Edit the color scheme in `styles/styles.css`:
```css
/* Primary color */
#667eea

/* Secondary color */
#764ba2

/* Success/Action color */
#28a745
```

### Modifying API Endpoint
Edit the API configuration in `scripts/script.js`:
```javascript
const API_CONFIG = {
    BASE_URL: 'http://time-table.sicsr.ac.in/report.php',
    CORS_PROXY: 'https://api.allorigins.win/raw?url='
};
```

## Troubleshooting

### Classes Not Loading
- Check internet connection
- Verify SICSR API is accessible
- Check browser console for errors (F12)
- Try a different date

### Batch Selection Not Working
- Clear browser cache and localStorage
- Try a different browser
- Check if JavaScript is enabled

### Mobile Display Issues
- Ensure viewport meta tag is present
- Check responsive design in mobile view
- Clear browser cache

## Performance Tips

- **Cached Data** - Selected batches are cached locally
- **Minimal Dependencies** - No external libraries required (pure vanilla JS)
- **Efficient Parsing** - Optimized CSV parsing with error handling
- **CORS Optimization** - Uses efficient CORS proxy service

## Development Notes

### Code Structure
- **Object-Oriented Design** - Three main classes for separation of concerns
- **Async/Await** - Modern promise handling for async operations
- **Error Handling** - Comprehensive try-catch blocks throughout
- **LocalStorage** - Persistent user preferences without backend

### Future Enhancements
- Offline support with service workers
- Dark mode theme
- Export timetable as PDF
- Multi-language support
- Notifications for upcoming classes
- Sync with calendar applications

## Known Limitations

- Depends on external CORS proxy service
- No offline functionality
- No user authentication
- Limited to SICSR API data structure
- No synchronization across devices

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is created for SICSR students. Feel free to use, modify, and distribute as needed.

## Credits

**Created by:** [TriforceParas](https://github.com/TriforceParas)

**Data Source:** SICSR Time Table API

---

**Last Updated:** October 29, 2025

**Version:** 1.0.0

For questions or issues, please open an issue on the repository or contact the developer.
