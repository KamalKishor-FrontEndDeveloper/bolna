import axios from 'axios';

async function testTenantCreation() {
  try {
    // First, let's test super admin login
    console.log('Testing super admin login...');
    const loginResponse = await axios.post('http://localhost:5000/api/super-admin/login', {
      email: 'admin@bolna-saas.com',
      password: 'password'
    });
    
    console.log('Login successful:', loginResponse.data);
    const token = loginResponse.data.token;
    
    // Now test tenant creation
    console.log('Testing tenant creation...');
    const tenantResponse = await axios.post('http://localhost:5000/api/super-admin/tenants', {
      name: "Digilantern",
      slug: "digilantern",
      admin_name: "Kamal Kishor",
      admin_email: "kamal.digilantern@gmail.com",
      admin_password: "Kamal123@",
      plan: "pro"
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Tenant creation successful:', tenantResponse.data);
    
  } catch (error) {
    console.error('Error details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testTenantCreation();