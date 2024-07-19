let mediaRecorder;
let audioChunks = [];
let firstInput = true;

async function toggleRecording() {
  const micButton = document.getElementById("mic-button");

  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    micButton.innerHTML = '<img src="mic-icon.png" alt="Mic" />';
  } else {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/mp3" });
      audioChunks = [];
      const audioURL = URL.createObjectURL(audioBlob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const audioFileName = `audio-${timestamp}.mp3`;

      // Save the audio file
      /*const a = document.createElement("a");
      a.style.display = "none";
      a.href = audioURL;
      a.download = audioFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(audioURL);
      document.body.removeChild(a);*/

      // Create a form data object
      const formData = new FormData();
      formData.append("audio", audioBlob, audioFileName);

      // Send the audio file to the server
      fetch("/upload-audio", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Success:", data);
        })
        .catch((error) => {
          console.error("Error:", error);
        });

      alert(`File has been saved as: ${audioFileName}`);
    };

    mediaRecorder.start();
    micButton.innerHTML = '<img src="mic-stop-icon.png" alt="Stop Mic" />';
  }
}

// Add event listener to the mic button
document
  .getElementById("mic-button")
  .addEventListener("click", toggleRecording);

async function sendMessage() {
  const userInput = document.getElementById("user-input");
  const sendButton = document.querySelector("button");
  const message = userInput.value.trim();

  if (message) {
    const chatBox = document.getElementById("chat-box");

    // Disable the send button
    sendButton.disabled = true;

    // Append user's message
    const userMessage = document.createElement("div");
    userMessage.className = "message user-message";
    userMessage.innerHTML = `<div class="chat-bubble">${message}</div><div class="user-icon-container"><img src="user-icon.png" class="user-icon" alt="User Icon"></div>`;
    chatBox.prepend(userMessage);

    // Clear the input field
    userInput.value = "";

    // Append typing indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "message bot-message";
    typingIndicator.id = "typing-indicator";
    typingIndicator.innerHTML = `<div class="bot-icon-container"><img src="bot-icon.png" class="bot-icon" alt="Bot Icon"></div><div class="chat-bubble">...</div>`;
    chatBox.prepend(typingIndicator);

    // Scroll to the top of the chat box
    chatBox.scrollTop = 0;

    if (firstInput) {
      // Send the user input to the backend
      try {
        //This will wait for response
        const response = await fetch("http://127.0.0.1:8000/submit/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            prompt: message,
          }),
        });

        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }

        const data = await response.json();
        const botResponse = data.response;

        const cleanedString = botResponse.replace(/[\n]/g, "");
        const jsonData = JSON.parse(cleanedString);

        // Call the function with the JSON data and convert to formated string
        let formatedBotResponse = formatResponse(jsonData);

        chatBox.removeChild(typingIndicator);

        const botMessage = document.createElement("div");
        botMessage.className = "message bot-message";
        botMessage.innerHTML = `<div class="bot-icon-container"><img src="bot-icon.png" class="bot-icon" alt="Bot Icon"></div><div class="chat-bubble">${formatedBotResponse}</div>`;
        chatBox.prepend(botMessage);

        // Scroll to the top of the chat box
        chatBox.scrollTop = 0;

        formatedBotResponse = formatedBotResponse.replace("<br>", "\n");
        // Log messages to a text file
        await logMessages(message, formatedBotResponse);

        // Re-enable the send button
        sendButton.disabled = false;
      } catch (error) {
        console.error(
          "There has been a problem with your fetch operation:",
          error
        );
      }
      firstInput = false;
    } else {
      //Generate Prescription************
      // Send the user input to the backend
      try {
        //Provide all previous data in prompt.

        //This will wait for response
        const response = await fetch("http://127.0.0.1:8000/prescription/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            prompt: message,
          }),
        });

        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }

        const data = await response.json();
        const botResponse = data.response;

        const formattedText = convertPrescriptionJsonToText(botResponse);

        chatBox.removeChild(typingIndicator);

        const botMessage = document.createElement("div");
        botMessage.className = "message bot-message";
        botMessage.innerHTML = `<div class="bot-icon-container"><img src="bot-icon.png" class="bot-icon" alt="Bot Icon"></div><div class="chat-bubble">${formattedText}</div>`;
        chatBox.prepend(botMessage);

        // Scroll to the top of the chat box
        chatBox.scrollTop = 0;

        //formatedBotResponse = formatedBotResponse.replace("<br>", "\n");
        // Log messages to a text file
        await logMessages(message, formattedText);

        // Re-enable the send button
        sendButton.disabled = false;
      } catch (error) {
        console.error(
          "There has been a problem with your fetch operation:",
          error
        );
      }
    }
  }
}

async function logMessages(userMessage, botResponse) {
  await fetch("/log-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userMessage, botResponse }),
  });
}

async function clearLogMessages() {
  await fetch("/clear-log-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}
clearLogMessages(); //call Clear log messages

// Add event listener for the Enter key
document
  .getElementById("user-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      const sendButton = document.querySelector("button");
      if (!sendButton.disabled) sendMessage();
    }
  });

function processBotJSONResponse(_botResp, _userInput) {
  switch (_botResp) {
    case "{ResponseType: GreetMessage}":
      // Add code for the 'GreetMessage' action
      break;
    case "{ResponseType: EmpathyMessage}":
      // Add code for the 'EmpathyMessage' action
      break;
    case "{ResponseType: Other}":
      // Add code for the 'Other' action
      break;
    default:
      // Code for handling unknown actions
      break;
  }
}

function formatResponse(data) {
  // Extract the empathy message
  const empathyMessage = data.EmpathyMessage;

  // Extract the questions
  const questions = data.Questions;

  // Start building the formatted response
  let formattedResponse = empathyMessage + "<br><br>";

  // Add each question to the formatted response
  questions.forEach((question) => {
    formattedResponse += "- " + question + "<br>";
  });

  // Return the formatted response
  return formattedResponse;
}

// Function to convert JSON to formatted text
function convertPrescriptionJsonToText(data) {
  let text = "";

  text += `Patient Name: ${data.name}<br>`;
  text += `Disease: ${data.disease}<br><br>`;
  text += "Medicine:<br>";
  data.medicine.forEach((med) => {
    text += `  - ${med.name}: ${med.dosage}<br>`;
  });
  text += `<br>Home Remedy: ${data.homeRemedy}<br>`;
  text += `<br>Comments: ${data.comments}`;

  return text;
}
