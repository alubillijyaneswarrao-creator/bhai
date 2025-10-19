// =================================================================================
// JAVASCRIPT FOR RAW EVENT WEBSITE
// =================================================================================

// --- 1. SUPABASE SETUP ---
// IMPORTANT: Replace with your actual Supabase URL and Public Anon Key
const SUPABASE_URL = 'https://bqmfjqexrububqelxwml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbWZqcWV4cnVidWJxZWx4d21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MjI2MjcsImV4cCI6MjA3NTQ5ODYyN30.J7lpQZ-q3-vtO68obTxTgcUFkTSCAoYuRKQFK0gQmyU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- 2. DOM ELEMENT SELECTORS ---
// Selectors for elements that might appear on any page
const logoutButton = document.querySelector('#logout-button');

// Selectors for login.html
const loginForm = document.querySelector('#login');
const signupForm = document.querySelector('#signup');
const showSignupLink = document.querySelector('#show-signup');
const showLoginLink = document.querySelector('#show-login');

// Selector for register.html
const registrationForm = document.querySelector('#event-registration-form');

// Selector for dashboard.html
const dashboardContent = document.querySelector('#dashboard-content');


// --- 3. AUTHENTICATION LOGIC ---

/**
 * Checks the current user's session status.
 * Redirects user based on their login status and current page.
 * @returns {object|null} The user object or null.
 */
const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // If user is logged in AND they are on the login page, redirect to dashboard
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = 'dashboard.html';
    }
    
    // If user is NOT logged in AND they are on a protected page, redirect to login
    const protectedPages = ['dashboard.html', 'register.html'];
    if (!user && protectedPages.some(page => window.location.pathname.includes(page))) {
        window.location.href = 'login.html';
    }
    
    return user;
};

// Handle Sign Up Form Submission
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.querySelector('#signup-email').value;
        const password = document.querySelector('#signup-password').value;

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            alert('Error signing up: ' + error.message);
        } else {
            alert('Signup successful! Please check your email for a confirmation link.');
            signupForm.reset();
        }
    });
}

// Handle Login Form Submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.querySelector('#login-email').value;
        const password = document.querySelector('#login-password').value;
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            alert('Error logging in: ' + error.message);
        } else {
            window.location.href = 'dashboard.html';
        }
    });
}

// Handle Logout Button Click
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });
}

// Handle toggling between Login and Signup forms on login.html
if (showSignupLink && showLoginLink) {
    const loginDiv = document.querySelector('#login-form');
    const signupDiv = document.querySelector('#signup-form');

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginDiv.style.display = 'none';
        signupDiv.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupDiv.style.display = 'none';
        loginDiv.style.display = 'block';
    });
}


// --- 4. DASHBOARD LOGIC ---

/**
 * Loads the user's registration status on the dashboard page.
 */
const loadDashboard = async () => {
    const user = await checkUser();
    if (!user || !dashboardContent) return;

    // Check if the user has an existing registration
    const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (data) {
        // User has registered
        dashboardContent.innerHTML = `
            <h2>Registration Complete! ✅</h2>
            <p>Thank you for registering for RAW-2. We have received your details.</p>
            <p><strong>Name:</strong> ${data.full_name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p>We will verify your payment and contact you shortly.</p>
        `;
    } else {
        // User has not registered yet
        dashboardContent.innerHTML = `
            <h2>Welcome to RAW-2!</h2>
            <p>You are logged in but have not yet registered for the event.</p>
            <a href="register.html"><button class="cta-button">Register for Event Now</button></a>
        `;
    }
};


// --- 5. REGISTRATION FORM LOGIC ---

/**
 * Handles the submission of the event registration form.
 */
const handleRegistration = async (e) => {
    e.preventDefault();
    const user = await checkUser();
    if (!user) return;

    const formButton = registrationForm.querySelector('button');
    formButton.disabled = true;
    formButton.textContent = 'Submitting...';

    // Get all form data
    const fullName = document.querySelector('#name').value;
    const age = document.querySelector('#age').value;
    const weight = document.querySelector('#weight').value;
    const height = document.querySelector('#height').value;
    const healthIssues = document.querySelector('#health-issues').value;
    const aadharFile = document.querySelector('#aadhar-upload').files[0];
    const paymentFile = document.querySelector('#payment-upload').files[0];

    try {
        // Upload Aadhar image
        const aadharFilePath = `public/${user.id}-aadhar-${aadharFile.name}`;
        let { error: aadharError } = await supabase.storage.from('uploads').upload(aadharFilePath, aadharFile);
        if (aadharError) throw aadharError;

        // Upload Payment image
        const paymentFilePath = `public/${user.id}-payment-${paymentFile.name}`;
        let { error: paymentError } = await supabase.storage.from('uploads').upload(paymentFilePath, paymentFile);
        if (paymentError) throw paymentError;

        // Get public URLs for the uploaded files
        const { data: aadharUrlData } = supabase.storage.from('uploads').getPublicUrl(aadharFilePath);
        const { data: paymentUrlData } = supabase.storage.from('uploads').getPublicUrl(paymentFilePath);
        
        // Insert all data into the 'registrations' table
        const { error: insertError } = await supabase.from('registrations').insert({
            user_id: user.id,
            full_name: fullName,
            age: age,
            weight: weight,
            height: height,
            email: user.email,
            health_issues: healthIssues,
            aadhar_url: aadharUrlData.publicUrl,
            payment_url: paymentUrlData.publicUrl
        });
        if (insertError) throw insertError;
        
        // Success
        alert('Registration successful!');
        window.location.href = 'dashboard.html';

    } catch (error) {
        alert('Error submitting registration: ' + error.message);
        formButton.disabled = false;
        formButton.textContent = 'Complete Registration';
    }
};

// Attach the event listener to the registration form if it exists
if (registrationForm) {
    registrationForm.addEventListener('submit', handleRegistration);
}


// --- 6. UI HELPER LOGIC ---

/**
 * Attaches event listeners to custom file inputs to display the selected filename.
 */
const attachFileInputListeners = () => {
    document.querySelectorAll('.file-upload-wrapper input[type="file"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
            const fileNameDisplay = e.target.nextElementSibling;
            if (fileNameDisplay && fileNameDisplay.classList.contains('file-name')) {
                fileNameDisplay.textContent = fileName;
            }
        });
    });
};


// --- 7. INITIALIZATION ---

/**
 * This runs when the page is fully loaded. It checks which page we are on
 * and runs the appropriate functions.
 */
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('dashboard.html')) {
        loadDashboard();
    } else if (path.includes('register.html')) {
        checkUser().then(user => {
            // Pre-fill email on registration page if user is logged in
            if(user) { document.querySelector('#email').value = user.email; }
        });
        attachFileInputListeners();
    } else {
       
        checkUser();
    }
});