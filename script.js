// Init TWA
Telegram.WebApp.ready();
Telegram.WebApp.onEvent("themeChanged", function () {
  document.documentElement.className = Telegram.WebApp.colorScheme;
});
Telegram.WebApp.MainButton.setParams({ text: "Main Button" });
Telegram.WebApp.MainButton.onClick(function () {
  Telegram.WebApp.showAlert("Main Button was clicked");
});
Telegram.WebApp.MainButton.show();

document.getElementById("theme-switch").addEventListener("change", (event) => {
  if (event.target.checked) {
    document.body.classList.remove("dark-theme");
  } else {
    document.body.classList.add("dark-theme");
  }
});

function createToken() {
  document.getElementById("create-token-form").classList.remove("hidden");
}

function transferTokens() {
  document.getElementById("transfer-token-form").classList.toggle("hidden");
}

//GET USER INPUT FROM FORMS AND SEND TO SMART CONTRACT/ BOT

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("create-token-form");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // Prevent the form from submitting normally

      // Get form data
      const tokenName = document.getElementById("token-name").value;
      const tokenSymbol = document.getElementById("token-symbol").value;
      const tokenSupply = document.getElementById("token-supply").value;
      const tokenAddress = document.getElementById("token-address").value;

      // Debugging: Log form data to the console
      console.log("Form submitted with values:", {
        tokenName,
        tokenSymbol,
        tokenSupply,
        tokenAddress,
      });

      // Add your logic here to handle the form data, such as sending it to an API
    });
  } else {
    console.error("Form with id 'create-token-form' not found.");
  }
});

// Create a message to send to the Telegram bot
//   const message = `
//     Token Name: ${tokenName}
//     Token Symbol: ${tokenSymbol}
//     Token Supply: ${tokenSupply}
//     Token Address: ${tokenAddress}
//   `;

// Send the message to the Telegram bot
//   sendMessageToTelegramBot(message);
// }

// Function to send a message to the Telegram bot
// function sendMessageToTelegramBot(message) {
//   const botToken = "YOUR_BOT_TOKEN"; // Replace with your bot token
//   const chatId = "YOUR_CHAT_ID"; // Replace with your chat ID
//   const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

//   fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       chat_id: chatId,
//       text: message,
//     }),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       if (data.ok) {
//         alert("Message sent successfully!");
//       } else {
//         alert("Error sending message: " + data.description);
//       }
//     })
//     .catch((error) => {
//       console.error("Error:", error);
//     });

function deployToken() {
  // Logic for deploying the token goes here
  // On successful deployment:
  showSuccessMessage();
}

function showSuccessMessage() {
  document.getElementById("button-container").classList.add("hidden");
  document.getElementById("success-message").classList.remove("hidden");
  setTimeout(() => {
    document.getElementById("button-container").classList.remove("hidden");
    document.getElementById("success-message").classList.add("hidden");
  }, 4000);
}

function createNewToken() {
  document.getElementById("create-token-form").classList.add("hidden");
  document.getElementById("button-container").classList.remove("hidden");
  document.getElementById("success-message").classList.add("hidden");
}

// import * as starknet from "https://cdn.jsdelivr.net/npm/starknet@5.19.5/+esm";
// const starkProvider = new starknet.SequencerProvider({
//   baseUrl: starknet.constants.BaseUrl.SN_MAIN,
// });
// async function getChainId() {
//   const chainId = await starkProvider.getChainId();
//   console.log("StarkNet Chain ID:", chainId);
// }
// getChainId();
