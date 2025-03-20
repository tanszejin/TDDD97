// Global WebSocket connection
let socket = null;

// Function to establish WebSocket connection
// Keep your existing WebSocket connection function mostly the same
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
        
        // Only handle invalid token errors (not expiration)
        if (data.message.includes("Invalid")) {
          localStorage.removeItem("token");
          alert("Invalid token. Please log in again.");
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

// Add this helper function for Mustache rendering
function renderTemplate(templateId, data = {}) {
  const template = document.getElementById(templateId).innerHTML;
  return Mustache.render(template, data);
}

// Modified displayView function to use Mustache templates
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

    // Create a new XMLHttpRequest
    const xhr = new XMLHttpRequest();

    // Configure the request
    xhr.open('POST', '/sign_in', true);

    // Set the content type to JSON
    xhr.setRequestHeader('Content-Type', 'application/json');
     // Set up callback for when the request completes
    xhr.onload = function() {
      console.log("Response status:", xhr.status);
    
      try {
        console.log("Sending sign-in data:", userData);
        // Parse the JSON response
        const data = JSON.parse(xhr.responseText);
        
        // Display feedback message
        feedbackElement.innerHTML = data.message || "Unknown response";
        
        // Handle successful sign-in
        if (xhr.status === 200 && data.success === 'True') {
          console.log("sign in successful");
          
          // Store the token in localStorage
          localStorage.setItem("token", data.data);
          
          // Get the token from the authorization header if available
          const authHeader = xhr.getResponseHeader('Authorisation');
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const tokenFromHeader = authHeader.substring(7);
            console.log("Token from header:", tokenFromHeader);
          }
          
          // Switch to profile view
          displayView("profileview");
          return true;
        } else {
          // Handle sign-in failure
          switch (xhr.status) {
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
              throw new Error(`${xhr.status} Error: Unexpected response.`);
          }
        }
      } catch (error) {
        // Error parsing JSON
        console.error('Sign in error:', error);
        feedbackElement.innerHTML = error.message || 'Failed to sign in. Please try again.';
        return false;
      }
    };

    // Set up error handling for network errors
    xhr.onerror = function() {
      console.error('Network error occurred');
      feedbackElement.innerHTML = "Network error. Please try again later.";
      return false;
    };

    // Prepare the data and send the request
    xhr.send(JSON.stringify(userData));
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
    // Create a new XMLHttpRequest
    const xhr = new XMLHttpRequest();

    // Configure the request
    xhr.open('POST', '/sign_up', true);

    // Set the content type to JSON
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Set up callback for when the request completes
    xhr.onload = function() {
      try {
        // Parse the JSON response
        const data = JSON.parse(xhr.responseText);
        
        if (xhr.status === 201) {
          // Success
          feedbackElement.innerHTML = data.message;
          
          if (data.success === 'True') {
            // Optional: You could redirect to sign-in page or clear the form
            // window.location.href = '/signin';
            // Or:
            signupForm.reset();
          }
        } else {
          // HTTP error
          switch (xhr.status) {
            case 400:
                throw new Error("It seems that your input is invalid. Please check your input.");
            case 405:
                throw new Error("Invalid request method. Please try again.");
            case 409:
                throw new Error("A user with this email already exists! Please use another email.");
            case 500:
                throw new Error("Something went wrong on the server.");
            default:
                throw new Error(`${xhr.status} Error: Unexpected response.`);
          }
        }
      } catch (error) {
        // Error parsing JSON
        console.error('Sign up error:', error);
        feedbackElement.style.color = "red";
        feedbackElement.innerHTML = error.message || 'Failed to sign up. Please try again.';
      }
    };

    // Set up error handling for network errors
    xhr.onerror = function() {
      console.error('Network error occurred');
      feedbackElement.innerHTML = 'Network error. Please try again later.';
    };

    // Prepare the data and send the request
    xhr.send(JSON.stringify(userData));

    return false;
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
let token = localStorage.getItem("token");
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
    // Prepare data for API call
    const requestData = {
      oldpassword: oldPassword,
      newpassword: newPassword
    };

    // Call the change_password endpoint
    // Create new XMLHttpRequest
    const xhr = new XMLHttpRequest();

    // Configure the request
    xhr.open('PUT', '/change_password', true);

    // Set the content type to JSON
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', token);

    // Set up callback for when the request completes
    xhr.onload = function() {
      console.log("Change password response status:", xhr.status);
      
      try {
        // Parse the JSON response
        const data = JSON.parse(xhr.responseText);
        
        if (xhr.status === 200) {
          // Success
          feedbackElement.textContent = data.message;
          if (data.success === 'True') {
            feedbackElement.style.color = "green";
          } else {
            feedbackElement.style.color = "red";
          }
        } else {
          // HTTP error
          switch (xhr.status) {
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
              throw new Error(`${xhr.status} Error: Unexpected response.`);
          }
        }
      } catch (error) {
        // Error parsing JSON
        console.error("Change password error:", error);
        feedbackElement.style.color = "red";
        feedbackElement.textContent = error.message;
      }
    };

    // Set up error handling for network errors
    xhr.onerror = function() {
      console.error('Network error occurred');
      feedbackElement.textContent = 'Network error. Please try again later.';
      feedbackElement.style.color = "red";
    };

    // Prepare the data and send the request
    xhr.send(JSON.stringify(requestData));
  };
}
}

function initializeSignOutButton() {
const signOutButton = document.getElementById("sign-out-button");

if (signOutButton) {
  signOutButton.addEventListener("click", function () {
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
    
    // Create a new XMLHttpRequest
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', '/sign_out', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', token);
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        console.log("Sign-out response status:", xhr.status);
        
        // Get response text
        const responseText = xhr.responseText;
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
        
        if (xhr.status !== 200) {
          let errorMessage;
          switch (xhr.status) {
            case 400:
              errorMessage = "It seems that your input is invalid. Please check your input.";
              break;
            case 401:            
              errorMessage = "It seems that you are not logged in.";
              break;
            case 405:
              errorMessage = "Invalid request method. Please try again.";
              break;
            case 500:
              errorMessage = "Something went wrong on the server.";
              break;
            default:
              errorMessage = `${xhr.status} Error: Unexpected response.`;
          }
          console.error("Sign-out error:", errorMessage);
          
          // In case of error, sign out locally anyway
          localStorage.removeItem("token");
          displayView("welcomeview");
          console.log("Signed out locally due to server error");
          return;
        }
        
        // Check if sign-out was successful
        if (xhr.status === 200 && data.success === 'True') {
          console.log("Sign-out successful:", data.message);
          
          // Clear token from localStorage
          localStorage.removeItem("token");
          
          // Redirect to welcome view
          displayView("welcomeview");
          console.log("Redirected to welcome view after sign-out");
        } else {
          console.log("This should not happen");
        }
      }
    };
    
    xhr.onerror = function() {
      console.error("Sign-out network error");
      // In case of network error, sign out locally anyway
      localStorage.removeItem("token");
      displayView("welcomeview");
      console.log("Signed out locally due to network error");
    };
    
    // Send the request
    xhr.send();
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
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/get_user_data_by_token', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', token);
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        console.log("get user data by token response status:", xhr.status);
        
        // Parse JSON response
        let data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) {
          console.error('Failed to parse response as JSON:', e);
          document.getElementById("email").innerHTML = 'Failed to display user data. Please try again.';
          return;
        }
        
        if (xhr.status !== 200) {
          let errorMessage;
          switch(xhr.status) {
            case 400:
              errorMessage = "It seems that your input is invalid. Please check your input.";
              break;
            case 401:
              errorMessage = "It seems that you are not logged in. Please refresh the page and log in.";
              break;
            case 405:
              errorMessage = "Invalid request method. Please try again.";
              break;
            case 500:
              errorMessage = "Something went wrong on the server.";
              break;
            default:
              errorMessage = `${xhr.status} Error: Unexpected response.`;
          }
          console.error('Display home panel error:', errorMessage);
          document.getElementById("email").innerHTML = errorMessage;
          return;
        }
        
        if (xhr.status === 200 && data.success === 'True') {
          document.getElementById("email").innerHTML = data.data.email;
          document.getElementById("firstname").innerHTML = data.data.firstname;
          document.getElementById("familyname").innerHTML = data.data.familyname;
          document.getElementById("gender").innerHTML = data.data.gender;
          document.getElementById("city").innerHTML = data.data.city;
          document.getElementById("country").innerHTML = data.data.country;
        }
        
        // Display wall
        reloadWall();
      }
    };
    
    xhr.onerror = function() {
      console.error('Display home panel network error');
      document.getElementById("email").innerHTML = 'Failed to display user data. Please try again.';
    };
    
    xhr.send();
  } catch (error) {
    console.error('Display home panel error:', error);
    document.getElementById("email").innerHTML = error.message || 'Failed to display user data. Please try again.';
  }
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

  let token = localStorage.getItem("token");
  const emailElement = document.getElementById("email");
  let userEmail = emailElement.textContent;

  const coords = await getLocation()

  const postData = {
    message: msg,
    email: userEmail, // Posting to the user's own wall
    latitude: coords.latitude.toString(),
    longitude: coords.longitude.toString()
  };
      // Create a new XMLHttpRequest
  const xhr = new XMLHttpRequest();

  // Configure the request
  xhr.open('POST', '/post_message', true);

  // Set the content type to JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', token);

  xhr.onload = function() {
    try {
      // Parse the JSON response
      const data = JSON.parse(xhr.responseText);
      
      if (xhr.status === 201 && data.success === 'True') {
        // Clear the message box
        document.getElementById("new-message").value = "";
        document.getElementById("post-feedback").style = "color: green;";
        document.getElementById("post-feedback").innerHTML = data.message;
        
        // Refresh the wall to show the new message
        reloadWall();
        return true;
      } 
      else {
        switch (xhr.status) {
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
            throw new Error(`${xhr.status} Error: Unexpected response.`);
        }
      }
    } catch (error) {
      // Error parsing JSON
      console.error('Post message error:', error);
      document.getElementById("post-feedback").innerHTML = error.message || 'Failed to post message. Please try again.';
      return false;
    }
  };

  // Set up error handling for network errors
  xhr.onerror = function() {
    console.error('Network error occurred');
    document.getElementById("post-feedback").style = "color: red;";
    document.getElementById("post-feedback").innerHTML = "Network error. Please try again later.";
    return false;
  };

  // Send the request with data
  xhr.send(JSON.stringify(postData));
}

async function reloadWall() {
    let token = localStorage.getItem("token");
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/get_user_messages_by_token', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', token);

    xhr.onload = function() {
      try {
        // Parse the JSON response
        const data = JSON.parse(xhr.responseText);
        console.log("Data array:", data.data);
        
        if (xhr.status === 200 && data.success === 'True') {
          const wall = document.getElementById("wall-messages");
          wall.innerHTML = ""; // Clear previous wall
          
          // Display each message as a list item
          data.data.forEach((msg) => {
            const listItem = document.createElement("li");
            listItem.class = "wall-message";
            listItem.draggable = true;
            listItem.ondragstart = dragstartHandler;
            listItem.innerHTML = `${msg.writer}: ${msg.message}`;
            const divItem = document.createElement("div");
            divItem.class = "wall-message-location";
            divItem.style = "font-size: 9px"
            const coordinates = `${msg.latitude},${msg.longitude}`;
            get_address_from_coordinates(coordinates)
              .then(address => divItem.innerHTML = `sent from ${address}`);
            listItem.appendChild(divItem);
            wall.appendChild(listItem);
          });
          
          // Clear any previous error messages
          document.getElementById("wall-feedback").innerHTML = "";
        } else {
          switch (xhr.status) {
            case 400:
              throw new Error("It seems that your input is invalid. Please check your input.");
            case 401:
              throw new Error("It seems that you are not logged in. Please log in first.");
            case 405:
              throw new Error("Invalid request method. Please try again.");
            case 500:
              throw new Error("Something went wrong on the server.");
            default:
              throw new Error(`${xhr.status} Error: Unexpected response.`);
          }
        }
      } catch (error) {
        console.error('Reload wall error:', error);
        document.getElementById("wall-feedback").innerHTML = error.message || 'Failed to reload wall. Please try again.';
      }
    };
  
    // Set up error handling for network errors
    xhr.onerror = function() {
      console.error('Network error occurred');
      document.getElementById("wall-feedback").innerHTML = "Network error. Please try again later.";
    };
  
    // Send the request with data
    xhr.send();
}

async function get_address_from_coordinates(coordinates) {
  const url = `https://geocode.xyz/${coordinates}?json=1&auth=10437519277611469283x94815 `;  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("HTTP Error for geolocation");
    const data = await response.json();
    if (data.error) {
      console.error("Error:", data.error.description);
      return null;
    }
    console.log("User Location:", data.city, data.country);
    return `${data.staddress}, ${data.city}, ${data.country}`;
  }
  catch (error) {
    console.error("error fetching location", error.message);
    return null;
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

    let token = localStorage.getItem("token");
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/get_user_data_by_email/'+email, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', token);

    xhr.onload = function() {
      try {
        // Parse the JSON response
        const userData = JSON.parse(xhr.responseText);
        console.log("userdata: ", userData.data);
        
        if (xhr.status === 200 && userData.success === 'True') {
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
          loadBrowseWall(currentBrowseUserEmail);
        } else {
          switch (xhr.status) {
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
              throw new Error(`${xhr.status} Error: Unexpected response.`);
          }
        }
      } catch (error) {
        // Error parsing JSON
        console.error('Browse user error:', error);
        browseFeedback.textContent = error.message || 'Failed to show users. Please try again.';
      }
    };

    // Set up error handling for network errors
    xhr.onerror = function() {
      console.error('Network error occurred');
      browseFeedback.textContent = "Network error. Please try again later.";
    };

    // Send the request with data
    xhr.send();
  };

  // Load the wall of the searched user
  async function loadBrowseWall(email) {
    browseWallMessages.innerHTML = ""; // Clear previous wall messages
    const token = localStorage.getItem("token");
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/get_user_messages_by_email/'+email, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', token);
    xhr.onload = function() {
      try {
        // Parse the JSON response
        const data = JSON.parse(xhr.responseText);
        
        if (xhr.status === 200 && data.success) {
          data.data.forEach((message) => {
            const listItem = document.createElement("li");
            listItem.class = "browse-wall-message";
            listItem.draggable = true;
            listItem.ondragstart = dragstartHandler;
            listItem.textContent = `${message.writer}: ${message.message}`;
            const divItem = document.createElement("div");
            divItem.class = "browse-wall-message-location";
            divItem.style = "font-size: 9px"
            const coordinates = `${message.latitude},${message.longitude}`;
            get_address_from_coordinates(coordinates)
              .then(address => divItem.innerHTML = `sent from ${address}`);
            listItem.appendChild(divItem);
            browseWallMessages.appendChild(listItem);
          });
        } else {
          switch (xhr.status) {
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
              throw new Error(`${xhr.status} Error: Unexpected response.`);
          }
        }
      } catch (error) {
        // Error parsing JSON
        console.error('Browse wall error:', error);
        browseWallMessages.innerHTML = `<li>${error.message}</li>`;
      }
    };

    // Set up error handling for network errors
    xhr.onerror = function() {
      console.error('Network error occurred');
      browseWallMessages.innerHTML = "<li>Network error. Please try again later.</li>";
    };

    // Send the request with data
    xhr.send();
  }

  async function browsePostMessage() {
    let msg = document.getElementById("browse-new-message").value;
    if (msg.length == 0) {
      document.getElementById("browse-post-feedback").innerHTML = "Write a message first!"
      return false;
    }
    let token = localStorage.getItem("token");
    const coords = await getLocation();
    const postData = {
      message: msg,
      email: currentBrowseUserEmail, // Posting to the user's own wall
      latitude: coords.latitude.toString(),
      longitude: coords.longitude.toString()
    };
    console.log("email to post to: " + currentBrowseUserEmail);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/post_message', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', token);
    xhr.onload = function() {
      try {
        // Parse the JSON response
        const data = JSON.parse(xhr.responseText);
        
        if (xhr.status === 201 && data.success === 'True') {
          document.getElementById("browse-new-message").value = "";
          document.getElementById("browse-post-feedback").style = "color: green;";
          document.getElementById("browse-post-feedback").innerHTML = "Message posted successfully.";
          browseReloadWall();
        }
        else{
          switch (xhr.status) {
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
              throw new Error(`${xhr.status} Error: Unexpected response.`);
          }
        }
      } catch (error) {
        console.error('Browse post messsage error:', error);
        document.getElementById("browse-post-feedback").style = "color: red;";
        document.getElementById("browse-post-feedback") = error.message || 'Failed to post message to browsed user. Please try again.';
      }
    };

    // Set up error handling for network errors
    xhr.onerror = function() {
      console.error('Network error occurred');
      document.getElementById("browse-post-feedback").innerHTML = "Network error. Please try again later.";
    };

    // Send the request with data
    xhr.send(JSON.stringify(postData));
  }

  const browsePostButton = document.getElementById("browse-post-button");
  browsePostButton.onclick = browsePostMessage;


  async function browseReloadWall() {
    const token = localStorage.getItem("token");
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/get_user_messages_by_email/'+currentBrowseUserEmail, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', token);
    xhr.onload = function() {
      try {
        // Parse the JSON response
        const data = JSON.parse(xhr.responseText);
        
        if (xhr.status === 200) {
          const wall = document.getElementById("browse-wall-messages");
          wall.innerHTML = "";
          data.data.forEach((msg) => {
            const listItem = document.createElement("li");
            listItem.class = "browse-wall-message";
            listItem.draggable = true;
            listItem.ondragstart = dragstartHandler;
            listItem.innerHTML = `${msg.writer}: ${msg.message}`;
            const divItem = document.createElement("div");
            divItem.class = "browse-wall-message-location";
            divItem.style = "font-size: 9px"
            const coordinates = `${msg.latitude},${msg.longitude}`;
            get_address_from_coordinates(coordinates)
              .then(address => divItem.innerHTML = `sent from ${address}`);
            listItem.appendChild(divItem);
            wall.appendChild(listItem);
          });
        }
        else {
          switch (xhr.status) {
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
              throw new Error(`${xhr.status} Error: Unexpected response.`);
          }
        }
      } catch (error) {
        console.error('Browse reload wall error:', error);
        document.getElementById("browse-wall-feedback").innerHTML = error.message || "Failed to reload browsed user's wall. Please try again.";
      }
    };

    // Set up error handling for network errors
    xhr.onerror = function() {
      console.error('Network error occurred');
      document.getElementById("browse-wall-feedback").innerHTML = "Network error. Please try again later.";
    };

    // Send the request with data
    xhr.send();
  }
  const browseReloadButton = document.getElementById("browse-reload");
  browseReloadButton.onclick = browseReloadWall;
}  

// for drag and drop functionality
function dragstartHandler(ev) {
  const textValue = ev.target.textContent.replace(ev.target.querySelector("div")?.textContent || "", "").trim();
  const message_array = textValue.split(":");
  message_array.shift();
  const message = message_array.join(":");
  ev.dataTransfer.setData("text", message);
}

function dragoverHandler(ev) {
  ev.preventDefault();
}

function dropHandler(ev) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text");
  console.log(data);
  ev.target.value = data;
}

// geolocation
async function getLocation() {
  if (navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    }).then(position => position.coords);
  }
  else {
    console.log("Geolocation not supported by this browser");
    return {latitude: "", longitude: ""};
  }
}



