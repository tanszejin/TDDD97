// Global WebSocket connection
let socket = null;

// Function to establish WebSocket connection
function connectWebSocket() {
  // Get the token from localStorage
  const token = localStorage.getItem("token");
  
  if (!token) {
    console.error("No token found, cannot establish WebSocket connection");
    return;
  }
  
  // Close any existing connection
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    socket.close();
  }
  
  // Determine the correct WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log("Connecting to WebSocket:", wsUrl);
  
  // Create a new WebSocket connection
  socket = new WebSocket(wsUrl);
  
  // Connection opened
  socket.onopen = function(event) {
    console.log("WebSocket connection established");
    
    // Send authentication token
    socket.send(JSON.stringify({
      token: token
    }));
  };
  
  // Listen for messages
  socket.onmessage = function(event) {
    console.log("WebSocket message received:", event.data);
    
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "logout") {
        console.log("Forced logout received");
        
        // Clear user data
        localStorage.removeItem("token");
        
        // Alert the user
        alert(data.message || "You have been logged out due to a login from another device.");
        
        // Redirect to welcome view
        displayView("welcomeview");
      }
      else if (data.type === "error") {
        console.error("WebSocket error:", data.message);
        
        // Handle invalid token errors
        if (data.message.includes("Invalid") || data.message.includes("expired")) {
          localStorage.removeItem("token");
          displayView("welcomeview");
        }
      }
    } catch (e) {
      console.error("Error parsing WebSocket message:", e);
    }
  };
  
  // Connection closed
  socket.onclose = function(event) {
    console.log("WebSocket connection closed");
    
    // Try to reconnect if still logged in
    if (localStorage.getItem("token")) {
      console.log("Attempting to reconnect WebSocket...");
      setTimeout(connectWebSocket, 5000);
    }
  };
  
  // Connection error
  socket.onerror = function(error) {
    console.error("WebSocket error:", error);
  };
}

// Function to disconnect WebSocket
function disconnectWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
// Function to display a view dynamically
const displayView = function (viewId) {
  const viewElement = document.getElementById(viewId);

  if (viewElement) {
    const viewContainer = document.getElementById("view-container");
    viewContainer.innerHTML = viewElement.innerHTML; // Extract and inject the view's content
    // If the profile view is displayed, initialize the tabs
    if (viewId === "profileview") {
      connectWebSocket();
      initializeTabs();
    }
    else{
      disconnectWebSocket();
      addEventListeners();
    }    
  } else {
    console.error(`View with ID "${viewId}" not found.`);
  }
};

window.onload = function(){
  //code that is executed as the page is loaded.
  //You shall put your own custom code here.
  //window.alert() is not allowed to be used in your implementation.
  //window.alert("Hello TDDD97!");
  let token = localStorage.getItem("token");
  if (token) {
      displayView("profileview");
  }
  else {
      displayView("welcomeview");
      addEventListeners();
  }  
};

function addEventListeners() {
  console.log("event listener")

  const signinForm = document.getElementById("signin-form");  
  console.log("sign in form")
  signinForm.onsubmit = async function (event) {
    event.preventDefault();
    // Get form field values
    console.log("on signin submit")
    const passwordField = document.getElementById("signin-password")
    const password = passwordField.value;

    // Clear previous error messages
    const passwordError = document.getElementById("password-error");
    if (passwordError) {
      passwordError.remove();
    }
    const feedbackElement = document.getElementById('signin-feedback');
    feedbackElement.innerHTML = ""

    // Validate password length
    const minLength = 8;
    if (password.length < minLength) {
      displayError("Password must be at least " + minLength + " characters long.", signinForm);
      event.preventDefault();
      return false;
    }
    const email = document.getElementById("signin-email").value;

    // If validations pass, allow form submission

    const userData = {
      email: email,
      password: password
    };

    // Show loading indicator
    feedbackElement.innerHTML = "Signing in..."

    try {
      console.log("Sending sign-in data:", userData);
      
      // Make asynchronous API call to sign_in endpoint
      const response = await fetch('/sign_in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      console.log("Response status:", response.status);
      
      // Try to parse as JSON
      const data = await response.json();

      if (!response.ok) {
        switch (response.status) {
          case 400:
            throw new Error("It seems that your input is invalid. Please check your input.");
          case 401:
            throw new Error("Your password is incorrect. Please try again.");
          case 404:
            throw new Error("No such user exists. Please try again.");
          case 405:
            throw new Error("Invalid request method. Please try again.");
          case 500:
            throw new Error("Something went wrong on the server.");
          default:
            throw new Error(`${response.status} Error: Unexpected response.`);
        }
      }  

      // Handle successful sign-in
      if (response.ok && data.success === 'True') {
        console.log("sign in successful")
        feedbackElement.innerHTML = "Signed in successfully";

        // Store the token in localStorage
        localStorage.setItem("token", data.data);

        // Get the token from the authorization header if available
        // const authHeader = response.headers.get('Authorization');
        // if (authHeader) {
        //   const tokenFromHeader = authHeader;
        //   console.log("Token from header:", tokenFromHeader);
        // }
        
        // Switch to profile view
        displayView("profileview");
        return true;
      } else {
        console.error("This should not happen");
        return false;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      feedbackElement.innerHTML = error.message || 'Failed to sign in. Please try again.';
      return false;
    }
  };
  console.log("sign in form end")


  // Sign-up form validation
  const signupForm = document.getElementById("signup-form");  
  console.log("sign up form")
  console.log("Signup form:", signupForm);
  if (signupForm) {
      console.log("Signup form found:", signupForm);
  }
  else{
      console.error("Signup form not found!");
  }
  signupForm.onsubmit =  async function (event) {
    event.preventDefault();
    // Get form field values
    console.log("on submit")
    const passwordField = document.getElementById("signup-password")
    const password = passwordField.value;

    const repeatPasswordField = document.getElementById("signup-repeatpassword")
    const repeatPassword = repeatPasswordField.value;

    // Clear previous error messages
    const passwordError = document.getElementById("password-error");
    if (passwordError) {
      passwordError.remove();
    }
    const feedbackElement = document.getElementById('signup-feedback');
    feedbackElement.innerHTML = "";

    // Validate password length
    const minLength = 8;
    if (password.length < minLength) {
      displayError("Password must be at least " + minLength + " characters long.", signupForm);
      event.preventDefault();
      return false;
    }

    // Validate matching passwords
    if (password !== repeatPassword) {
      console.log("passwords do not match")
      displayError("Passwords do not match.", signupForm);
      event.preventDefault();
      return false;
    }

    // If validations pass, allow form submission

    // get values of all fields
    let userData = {
      email: document.getElementById("signup-email").value,
      password: passwordField.value,
      firstname: document.getElementById("firstname").value,
      familyname: document.getElementById("familyname").value,
      gender: document.getElementById("gender").value,
      city: document.getElementById("city").value,
      country: document.getElementById("country").value
    };

    feedbackElement.innerHTML = "Signing up...";

    try {
      console.log("Sending signup data:", userData);
      // Make asynchronous API call to sign_up endpoint
      const response = await fetch('/sign_up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      // Parse JSON response
      const data = await response.json();
      
      if (!response.ok) {
        switch (response.status) {
          case 400:
              throw new Error("It seems that your input is invalid. Please check your input.");
          case 405:
              throw new Error("Invalid request method. Please try again.");
          case 409:
              throw new Error("A user with this email already exists! Please use another email.");
          case 500:
              throw new Error("Something went wrong on the server.");
          default:
              throw new Error(`${response.status} Error: Unexpected response.`);
        }        
      }
      
      // Display success message
      feedbackElement.style.color = "green";
      feedbackElement.innerHTML = "You have signed up successfully!";
      
      if (data.success === 'True') {
        // Optional: You could redirect to sign-in page or clear the form
        // window.location.href = '/signin';
        // Or:
        signupForm.reset();
      }
    } catch (error) {
      console.error('Sign up error:', error);
      feedbackElement.style.color = "red";
      feedbackElement.innerHTML = error.message || 'Failed to sign up. Please try again.';
    }

    return false; // Prevent default form submission
  };

  // Function to display error messages
  function displayError(message, form) {
    const error = document.createElement("div");
    error.id = "password-error";
    error.style.color = "red";
    error.textContent = message;
    form.appendChild(error);
  }
};

// Function to initialize tabs
function initializeTabs() {
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", function () {
    // Remove active class from all tabs
    tabs.forEach((t) => t.classList.remove("active"));

    // Add active class to the clicked tab
    tab.classList.add("active");

    // Hide all panels
    panels.forEach((panel) => (panel.style.display = "none"));

    // Show the associated panel
    const targetPanel = document.getElementById(tab.dataset.target);
    targetPanel.style.display = "block";

    // Initialize the displau for each tab
    if (tab.dataset.target === "account-panel") {
      console.log("Account tab opened");
      initializeChangePasswordForm();
      initializeSignOutButton();
    }
    else if (tab.dataset.target === "home-panel") {
      displayHomePanel();
    }
    else if (tab.dataset.target === "browse-panel") {
      initializeBrowseTab();
    }
  });
});
displayHomePanel();
}

function initializeChangePasswordForm() {
const changePasswordForm = document.getElementById("change-password-form");

if (changePasswordForm) {
  changePasswordForm.onsubmit = async function (event) {
    event.preventDefault(); // Prevents the form from submitting normally

    // Get form field values
    const oldPassword = document.getElementById("old-password").value;
    const newPassword = document.getElementById("new-password").value;
    const repeatNewPassword = document.getElementById("repeat-new-password").value;

    // Clear previous feedback messages
    const feedbackElement = document.getElementById("change-password-feedback");
    feedbackElement.textContent = "";

    // Validate password fields
    if (newPassword.length < 8) {
      feedbackElement.textContent = "The new password must be at least 8 characters long.";
      return;
    }
    if (newPassword !== repeatNewPassword) {
      feedbackElement.textContent = "The new passwords do not match.";
      return;
    }

    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      console.log("Retrieved token for password change:", token);
      
      // Prepare data for API call
      const requestData = {
        oldpassword: oldPassword,
        newpassword: newPassword
      };

      // Call the change_password endpoint
      const response = await fetch('/change_password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(requestData)
      });
      
      console.log("Change password response status:", response.status);

      // Parse JSON response
      const data = await response.json();
        
      if (!response.ok) {
        switch (response.status) {
          case 400:
            throw new Error("It seems that your input is invalid. Please check your input.");
          case 401:
            throw new Error("Your old password is incorrect. Please try again.");
          case 404:
            throw new Error("No such user exists. Please try again.");
          case 405:
            throw new Error("Invalid request method. Please try again.");
          case 500:
            throw new Error("Something went wrong on the server.");
          default:
            throw new Error(`${response.status} Error: Unexpected response.`);
        }
      }
      
      if (response.ok && data.success === 'True') {
        feedbackElement.style.color = "green";
        feedbackElement.textContent = data.message;
      } else {
        feedbackElement.style.color = "red";
        feedbackElement.textContent = "This should not happen";
      }
    }
    catch (error) {
      console.error("Change password error:", error);
      feedbackElement.style.color = "red";
      feedbackElement.textContent = error.message;
    }
  };
}
}

function initializeSignOutButton() {
const signOutButton = document.getElementById("sign-out-button");

if (signOutButton) {
  signOutButton.addEventListener("click", async function () {
    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      console.log("Retrieved token for sign out:", token);
      disconnectWebSocket();
      
      if (!token) {
        console.error("No token found in localStorage");
        displayView("welcomeview");
        return;
      }
      
      console.log("Sending sign-out request with token:", token);
      
      // Call the sign_out endpoint
      const response = await fetch('/sign_out', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      
      console.log("Sign-out response status:", response.status);
      
      // Get response text
      const responseText = await response.text();
      console.log("Raw sign-out response:", responseText);
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse sign-out response as JSON:", e);
        // If we can't parse the response, assume sign-out failed
        return;
      }

      if (!response.ok) {
        switch (response.status) {
          case 400:
            throw new Error("It seems that your input is invalid. Please check your input.");
          case 401:            
            throw new Error("It seems that you are not logged in.");
          case 405:
            throw new Error("Invalid request method. Please try again.");
          case 500:
            throw new Error("Something went wrong on the server.");
          default:
            throw new Error(`${response.status} Error: Unexpected response.`);
        }
      }  
      
      // Check if sign-out was successful
      if (response.ok && data.success === 'True') {
        console.log("Sign-out successful:", data.message);
        
        // Clear token from localStorage
        localStorage.removeItem("token");
        
        // Redirect to welcome view
        displayView("welcomeview");
        console.log("Redirected to welcome view after sign-out");
      } else {
        console.log("This should not happen")        
      }
    } catch (error) {
      console.error("Sign-out error:", error);      
      // In case of network error, sign out locally anyway
      localStorage.removeItem("token");
      displayView("welcomeview");
      console.log("Signed out locally due to network/server error");
    }
  });
  
  console.log("Sign-out button event listener attached");
} else {
  console.error("Sign-out button not found in the DOM");
}
}

async function displayHomePanel() {
  // Display user profile
  try {
    const token = localStorage.getItem("token");
    const response = await fetch('/get_user_data_by_token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });
    
    console.log("get user data by token response status:", response.status);

    // Parse JSON response
    const data = await response.json();
        
    if (!response.ok) {
      switch(response.status) {
        case 400:
          throw new Error("It seems that your input is invalid. Please check your input.");
        case 401:
          throw new Error("It seems that you are not logged in. Please refresh the page and log in.");
        case 405:
          throw new Error("Invalid request method. Please try again.");
        case 500:
          throw new Error("Something went wrong on the server.");
        default:
          throw new Error(`${response.status} Error: Unexpected response.`);
      }
    }

    if (response.ok && data.success === 'True') {
      document.getElementById("email").innerHTML = data.data.email;
      document.getElementById("firstname").innerHTML = data.data.firstname;
      document.getElementById("familyname").innerHTML = data.data.familyname;
      document.getElementById("gender").innerHTML = data.data.gender;
      document.getElementById("city").innerHTML = data.data.city;
      document.getElementById("country").innerHTML = data.data.country;
    }
  }
  catch (error) {
    console.error('Display home panel error:', error);
    document.getElementById("email").innerHTML = error.message || 'Failed to display user data. Please try again.';
  }
  // Display wall
  reloadWall();
}

async function postMessage() {
  // Get the message in text area
  let msg = document.getElementById("new-message").value;

  // Input validation - check if there is anything written
  if (msg.length == 0) {
    document.getElementById("post-feedback").style = "color: red;"
    document.getElementById("post-feedback").innerHTML = "Write a message first!"
    return false;
  }

  try {
    let token = localStorage.getItem("token");
    const emailElement = document.getElementById("email");
    let userEmail = emailElement.textContent;

    const postData = {
      message: msg,
      email: userEmail // Posting to the user's own wall
    };

    const response = await fetch('/post_message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(postData)
    });

    const data = await response.json();

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error("It seems that your input is invalid. Please check your input.");
        case 401:
          throw new Error("It seems that you are not logged in. Please log in first");
        case 404:
          throw new Error("No such user exists. Please try again.");
        case 405:
          throw new Error("Invalid request method. Please try again.");
        case 500:
          throw new Error("Something went wrong on the server.");
        default:
          throw new Error(`${response.status} Error: Unexpected response.`);
      }
    }

    if (response.ok && data.success === 'True') {
      // Clear the message box
      document.getElementById("new-message").value = "";
      document.getElementById("post-feedback").style = "color: green;";
      document.getElementById("post-feedback").innerHTML = "Message posted successfully!";
      
      // Refresh the wall to show the new message
      reloadWall();
      return true;
    } 
    else {
      document.getElementById("post-feedback").innerHTML = "This should not happen";
    }
  }
  catch (error) {
    console.error('Post message error:', error);
    document.getElementById("post-feedback").innerHTML = error.message || 'Failed to post message. Please try again.';
    return false;
  }
}

async function reloadWall() {
  try {
    let token = localStorage.getItem("token");
    const response = await fetch('/get_user_messages_by_token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });

    const data = await response.json();
    console.log("Data array:", data.data);

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error("It seems that your input is invalid. Please check your input.");
        case 401:
          throw new Error("It seems that you are not logged in. Please log in first.");
        case 405:
          throw new Error("Invalid request method. Please try again.");
        case 500:
          throw new Error("Something went wrong on the server.");
        default:
          throw new Error(`${response.status} Error: Unexpected response.`);
      }
    }  

    if (response.ok && data.success === 'True') {
      const wall = document.getElementById("wall-messages");
      wall.innerHTML = ""; // Clear previous wall
      
      // Display each message as a list item
      data.data.forEach((msg) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `${msg.writer}: ${msg.message}`;
        wall.appendChild(listItem);
      });
      
      // Clear any previous error messages
      document.getElementById("wall-feedback").innerHTML = "";
    } else {
      document.getElementById("wall-feedback").innerHTML = "This should not happen";
    }
  }
  catch (error) {
    console.error('Reload wall error:', error);
    document.getElementById("wall-feedback").innerHTML = error.message || 'Failed to reload wall. Please try again.';
  }
}

async function initializeBrowseTab() {
  const browseUserForm = document.getElementById("browse-user-form");
  const browseFeedback = document.getElementById("browse-feedback");
  const browseUserHome = document.getElementById("browse-user-home");
  const browseWallMessages = document.getElementById("browse-wall-messages");
  const postToBrowseWallForm = document.getElementById("post-to-browse-wall");
  const reloadBrowseWallButton = document.getElementById("reload-browse-wall");

  // Fields for user information
  const browseUserInfo = {
    email: document.getElementById("browse-email"),
    firstname: document.getElementById("browse-firstname"),
    familyname: document.getElementById("browse-familyname"),
    gender: document.getElementById("browse-gender"),
    city: document.getElementById("browse-city"),
    country: document.getElementById("browse-country"),
  };

  let currentBrowseUserEmail = null; // Track the currently browsed user

  // Search for a user by email
  browseUserForm.onsubmit = async function (event) {
    event.preventDefault();
    const email = document.getElementById("search-email").value;
    browseFeedback.textContent = ""; // Clear feedback
    browseUserHome.style.display = "none"; // Hide user profile until found

    try {
      // Fetch user info from the server
      const token = localStorage.getItem("token");
      const response = await fetch('/get_user_data_by_email/'+email, {
        method: 'GET', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });

      const userData = await response.json();
      console.log("userdata: ", userData.data);

      if (!response.ok) {
        switch (response.status) {
          case 400:
            throw new Error("It seems that your input is invalid. Please check your input.");
          case 401:
            throw new Error("It seems that you are not logged in. Please log in first.");
          case 404:
            throw new Error("No such user exists. Please try again.");
          case 405:
            throw new Error("Invalid request method. Please try again.");
          case 500:
            throw new Error("Something went wrong on the server.");
          default:
            throw new Error(`${response.status} Error: Unexpected response.`);
        }
      }  

      if (response.ok && userData.success === 'True') {
        // Update user info section
        currentBrowseUserEmail = email;
        browseFeedback.textContent = "";
        browseUserHome.style.display = "block";
        browseUserInfo.email.textContent = userData.data[0].email;
        browseUserInfo.firstname.textContent = userData.data[0].firstname;
        browseUserInfo.familyname.textContent = userData.data[0].familyname;
        browseUserInfo.gender.textContent = userData.data[0].gender;
        browseUserInfo.city.textContent = userData.data[0].city;
        browseUserInfo.country.textContent = userData.data[0].country;

        // Load the wall for the searched user
        loadBrowseWall(email);
      } else {
        browseFeedback.textContent = "This should not happen"
      }
    }
    catch (error) {
      console.error('Browse user error:', error);
      browseFeedback.textContent = error.message || 'Failed to show users. Please try again.';
    }
  };

  // Load the wall of the searched user
  async function loadBrowseWall(email) {
    browseWallMessages.innerHTML = ""; // Clear previous wall messages
    try {
      const token = localStorage.getItem("token");

      const response = await fetch('/get_user_messages_by_email/'+email, {
        method: 'GET', // Change to POST to allow sending a body
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });

      const data = await response.json();

      if (!response.ok) {
        switch (response.status) {
          case 400:
            throw new Error("It seems that your input is invalid. Please check your input.");
          case 401:
            throw new Error("It seems that you are not logged in. Please log in first.");
          case 404:
            throw new Error("No such user exists. Please try again.");
          case 405:
            throw new Error("Invalid request method. Please try again.");
          case 500:
            throw new Error("Something went wrong on the server.");
          default:
            throw new Error(`${response.status} Error: Unexpected response.`);
        }
      }  

      if (response.ok && data.success) {
        data.data.forEach((message) => {
          const listItem = document.createElement("li");
          listItem.textContent = `${message.writer}: ${message.message}`;
          browseWallMessages.appendChild(listItem);
        });
      } else {
        console.log("This should not happen")
      }
    }
    catch (error) {
      console.error('Browse wall error:', error);
      browseWallMessages.innerHTML = `<li>${error.message}</li>`;
    }

    async function browsePostMessage() {
      let msg = document.getElementById("browse-new-message").value;
      if (msg.length == 0) {
        document.getElementById("browse-post-feedback").innerHTML = "Write a message first!"
        return false;
      }

      try {
        let token = localStorage.getItem("token");

        const postData = {
          message: msg,
          email: currentBrowseUserEmail // Posting to the user's own wall
        };

        const response = await fetch('/post_message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify(postData)
        });

        const data = await response.json();

        if (!response.ok) {
          switch (response.status) {
            case 400:
              throw new Error("It seems that your input is invalid. Please check your input.");
            case 401:
              throw new Error("It seems that you are not logged in. Please log in first.");
            case 404:
              throw new Error("No such user exists. Please try again.");
            case 405:
              throw new Error("Invalid request method. Please try again.");
            case 500:
              throw new Error("Something went wrong on the server.");
            default:
              throw new Error(`${response.status} Error: Unexpected response.`);
          }
        }  

        if (response.ok && data.success === 'True') {
          document.getElementById("browse-new-message").value = "";
          document.getElementById("browse-post-feedback").style = "color: green;";
          document.getElementById("browse-post-feedback").innerHTML = "Message posted successfully.";
          browseReloadWall();
        }        
      }
      catch (error) {
        console.error('Browse post messsage error:', error);
        document.getElementById("browse-post-feedback").style = "color: red;";
        document.getElementById("browse-post-feedback") = error.message || 'Failed to post message to browsed user. Please try again.';
      }
    }

    const browsePostButton = document.getElementById("browse-post-button");
    browsePostButton.onclick = browsePostMessage;


    async function browseReloadWall() {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch('/get_user_messages_by_email/'+email, {
          method: 'GET', // Change to POST to allow sending a body
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          }
        });

        const data = await response.json();

        if (!response.ok) {
          switch (response.status) {
            case 400:
              throw new Error("It seems that your input is invalid. Please check your input.");
            case 401:
              throw new Error("It seems that you are not logged in. Please log in first.");
            case 404:
              throw new Error("No such user exists. Please try again.");
            case 405:
              throw new Error("Invalid request method. Please try again.");
            case 500:
              throw new Error("Something went wrong on the server.");
            default:
              throw new Error(`${response.status} Error: Unexpected response.`);
          }
        }  

        if (response.ok && data.success) {
          const wall = document.getElementById("browse-wall-messages");
          wall.innerHTML = "";
          data.data.forEach((msg) => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `${msg.writer}: ${msg.message}`;
            wall.appendChild(listItem);
          });
        }
        else {
          console.log("This should not happen");
        }
      }
      catch (error) {
        console.error('Browse reload wall error:', error);
        document.getElementById("browse-wall-feedback").innerHTML = error.message || "Failed to reload browsed user's wall. Please try again.";
      }
    }
    const browseReloadButton = document.getElementById("browse-reload");
    browseReloadButton.onclick = browseReloadWall;
  }  
}
