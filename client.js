// Function to display a view dynamically
const displayView = function (viewId) {
  const viewElement = document.getElementById(viewId);

  if (viewElement) {
    const viewContainer = document.getElementById("view-container");
    viewContainer.innerHTML = viewElement.innerHTML; // Extract and inject the view's content
    // If the profile view is displayed, initialize the tabs
    if (viewId === "profileview") {
      initializeTabs();
    }
    addEventListeners();
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
  const viewContainer = document.getElementById("view-container");
  if (token) {
      displayView("profileview");
  }
  else {
      displayView("welcomeview");
  }
  displayView("welcomeview");

  addEventListeners();
};

function addEventListeners() {
  console.log("event listener")

  const signinForm = document.getElementById("signin-form");  
  console.log("sign in form")
  signinForm.onsubmit = function (event) {
    // Get form field values
    console.log("on signin submit")
    const passwordField = document.getElementById("signin-password")
    const password = passwordField.value;

    // Clear previous error messages
    const passwordError = document.getElementById("password-error");
    if (passwordError) {
      passwordError.remove();
    }

    // Validate password length
    const minLength = 8;
    if (password.length < minLength) {
      displayError("Password must be at least " + minLength + " characters long.", signinForm);
      event.preventDefault();
      return false;
    }

    // If validations pass, allow form submission

    // get values of all fields
    let email = document.getElementById("signin-email").value;
    let signin = serverstub.signIn(email, password);
    document.getElementById('signin-feedback').innerHTML = signin.message;
    
    console.log(signin.message);
    if (signin.success) {
      localStorage.setItem("token", signin.data);
      displayView("profileview")
    }

    return signin.success;
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
  signupForm.onsubmit = function (event) {
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
    let details = {
      email: document.getElementById("signup-email").value,
      password: passwordField.value,
      firstname: document.getElementById("firstname").value,
      familyname: document.getElementById("familyname").value,
      gender: document.getElementById("gender").value,
      city: document.getElementById("city").value,
      country: document.getElementById("country").value
    };
    let signup = serverstub.signUp(details);
    document.getElementById('signup-feedback').innerHTML = signup.message;
    return signup.success;
  };

  // Function to display error messages
  function displayError(message, form) {
    const error = document.createElement("div");
    error.id = "password-error";
    error.style.color = "red";
    error.textContent = message;
    form.appendChild(error);
  }



  // Clear error message on input
// passwordField.addEventListener("input", clearErrorMessage);
// repeatPasswordField.addEventListener("input", clearErrorMessage);

function clearErrorMessage() {
  const passwordError = document.getElementById("password-error");
    if (passwordError) {
      passwordError.remove();
    }
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

    // Initialize the change password form if the Account tab is selected
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
  changePasswordForm.onsubmit = function (event) {
    event.preventDefault(); // Prevent the form from submitting normally

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

    // Simulate a password change 
    const token = localStorage.getItem("token");
    console.log("Retrieved token:", token);
    const result = serverstub.changePassword(token, oldPassword, newPassword);
    

    // Display feedback based on server response
    feedbackElement.textContent = result.message;
    if (result.success) {
      feedbackElement.style.color = "green";
    } else {
      feedbackElement.style.color = "red";
    }
  };
}
}

function initializeSignOutButton() {
const signOutButton = document.getElementById("sign-out-button");

if (signOutButton) {
  signOutButton.addEventListener("click", function () {
    const token = localStorage.getItem("token");
    console.log("Retrieved token:", token);
    const result = serverstub.signOut(token);
    
    
    // Redirect to the welcome view
    if (result.success){
      localStorage.removeItem("token");
      displayView("welcomeview");
    }
    console.log("User signed out successfully.");
  });
}
}

function displayHomePanel() {
  // display user profile
  token = localStorage.getItem("token");
  user = serverstub.getUserDataByToken(token);
  if (user.success) {
    document.getElementById("email").innerHTML = user.data.email;
    document.getElementById("firstname").innerHTML = user.data.firstname;
    document.getElementById("familyname").innerHTML = user.data.familyname;
    document.getElementById("gender").innerHTML = user.data.gender;
    document.getElementById("city").innerHTML = user.data.city;
    document.getElementById("country").innerHTML = user.data.country;
  }

  // display wall
  reloadWall();
}

function postMessage() {
  let msg = document.getElementById("new-message").value;
  if (msg.length == 0) {
    document.getElementById("post-feedback").style = "color: red;"
    document.getElementById("post-feedback").innerHTML = "write a message first dumbass"
    return false;
  }
  let token = localStorage.getItem("token");
  toPostMessage = serverstub.postMessage(token, msg, serverstub.getUserDataByToken(token).data.email);
  if (toPostMessage.success) {
    document.getElementById("new-message").value = "";
    document.getElementById("post-feedback").style = "color: green;"
  }
  else {
    document.getElementById("post-feedback").style = "color: red;"
  }
  document.getElementById("post-feedback").innerHTML = toPostMessage.message;
  }

  function reloadWall() {
  let token = localStorage.getItem("token");
  let messages = serverstub.getUserMessagesByToken(token); // array of all messages
  if (messages.success) {
    const wall = document.getElementById("wall-messages");
    wall.innerHTML = "";
    messages.data.forEach((msg) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `${msg.writer}: ${msg.content}`;
      wall.appendChild(listItem);
    });
  }
  else {
    document.getElementById("wall-feedback").innerHTML = messages.message;
  }
}

function initializeBrowseTab() {
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
  browseUserForm.onsubmit = function (event) {
    event.preventDefault();
    const email = document.getElementById("search-email").value;
    browseFeedback.textContent = ""; // Clear feedback
    browseUserHome.style.display = "none"; // Hide user profile until found

    // Fetch user info from the server
    const token = localStorage.getItem("token");
    const userInfo = serverstub.getUserDataByEmail(token, email);

    if (userInfo.success) {
      // Update user info section
      currentBrowseUserEmail = email;
      browseFeedback.textContent = "";
      browseUserHome.style.display = "block";
      browseUserInfo.email.textContent = userInfo.data.email;
      browseUserInfo.firstname.textContent = userInfo.data.firstname;
      browseUserInfo.familyname.textContent = userInfo.data.familyname;
      browseUserInfo.gender.textContent = userInfo.data.gender;
      browseUserInfo.city.textContent = userInfo.data.city;
      browseUserInfo.country.textContent = userInfo.data.country;

      // Load the wall for the searched user
      loadBrowseWall(email);
    } else {
      browseFeedback.textContent = userInfo.message;
    }
  };

  // Load the wall of the searched user
  function loadBrowseWall(email) {
    browseWallMessages.innerHTML = ""; // Clear previous wall messages
    const token = localStorage.getItem("token");
    const wallMessages = serverstub.getUserMessagesByEmail(token, email);

    if (wallMessages.success) {
      wallMessages.data.forEach((message) => {
        const listItem = document.createElement("li");
        listItem.textContent = `${message.writer}: ${message.content}`;
        browseWallMessages.appendChild(listItem);
      });
    } else {
      browseWallMessages.innerHTML = `<li>${wallMessages.message}</li>`;
    }
  }

  function browsePostMessage() {
    let msg = document.getElementById("browse-new-message").value;
    if (msg.length == 0) {
      document.getElementById("browse-post-feedback").innerHTML = "write a message first dumbass"
      return false;
    }
    let token = localStorage.getItem("token");
    toPostMessage = serverstub.postMessage(token, msg, currentBrowseUserEmail);
    if (toPostMessage.success) {
      document.getElementById("browse-new-message").value = "";
    }
    document.getElementById("browse-post-feedback").innerHTML = toPostMessage.message;
  }

  const browsePostButton = document.getElementById("browse-post-button");
  browsePostButton.onclick = browsePostMessage;


  function browseReloadWall() {
    let token = localStorage.getItem("token");
    let messages = serverstub.getUserMessagesByEmail(token, currentBrowseUserEmail); // array of all messages
    if (messages.success) {
      const wall = document.getElementById("browse-wall-messages");
      wall.innerHTML = "";
      messages.data.forEach((msg) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `${msg.writer}: ${msg.content}`;
        wall.appendChild(listItem);
      });
    }
    else {
      document.getElementById("browse-wall-feedback").innerHTML = messages.message;
    }
  }

  const browseReloadButton = document.getElementById("browse-reload");
  browseReloadButton.onclick = browseReloadWall;
}
