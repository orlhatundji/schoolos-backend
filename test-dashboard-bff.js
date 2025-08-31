const axios = require('axios');

// Test the dashboard BFF endpoint
async function testDashboardBFF() {
  try {
    console.log('Testing Dashboard BFF endpoint...');
    
    // You'll need to replace these with actual values from your system
    const baseURL = 'http://localhost:3000'; // Adjust port as needed
    const token = 'your-jwt-token-here'; // Replace with actual token
    
    const response = await axios.get(`${baseURL}/bff/admin/dashboard-summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Dashboard BFF endpoint working!');
    console.log('Response status:', response.status);
    console.log('Response data structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Validate the response structure
    const data = response.data;
    const requiredSections = [
      'overview', 'studentStats', 'teacherStats', 'classroomStats', 
      'subjectStats', 'departmentStats', 'levelStats', 'adminStats',
      'attendanceStats', 'paymentStats', 'recentActivities', 'academicInfo'
    ];
    
    for (const section of requiredSections) {
      if (!data[section]) {
        console.error(`❌ Missing section: ${section}`);
      } else {
        console.log(`✅ Section ${section} present`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Dashboard BFF:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testDashboardBFF();
