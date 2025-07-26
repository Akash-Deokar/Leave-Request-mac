const GEMINI_API_KEY = 'AIzaSyBs0y41bCYMKXs8fDrYoLEHnFicf335kq0';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('form').setTitle("Mortgage Correction App");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDocumentTypes() {
  return ['Deed of Trust', 'Note', 'NORC', '4506-C', 'W-9', 'USA Patriot', '1003'];
}

function processForm(formData) {
  const { loanNumber, borrowerLastName, propertyAddress, recipientsTo, recipientsCc, borrowers } = formData;

  const prompt = buildPrompt(loanNumber, borrowerLastName, propertyAddress, borrowers);
  const correctionDetails = callGeminiAPI(prompt);

  const subject = `Urgent Funding Delay: ${borrowerLastName}, ${propertyAddress}, ${loanNumber}`;
  const body = `
Hello Team,

I am the funder assigned to the loan no. ${loanNumber}. After reviewing the closed loan package, below are the required corrections:

${correctionDetails}

Please return the above required corrections in order to avoid funding delays.

Regards,  
`;

  GmailApp.createDraft(recipientsTo.join(","), subject, body, {
    cc: recipientsCc.join(",")
  });

  return "✅ Gmail draft created successfully using Gemini API.";
}

function buildPrompt(loanNumber, borrowerLastName, propertyAddress, borrowers) {
  let prompt = `You are a professional mortgage loan funder.\n\nFormat each correction exactly as:\n1) On [Document Name] document, [issue] for borrower ([Name]).\n\nCorrections:\n`;

  let count = 1;
  borrowers.forEach(b => {
    const name = b.fullName;
    b.documents.forEach(doc => {
      const docType = doc.documentType;
      doc.issues.forEach(issue => {
        prompt += `${count}) On ${docType} document, ${issue.toLowerCase()} for borrower (${name}).\n`;
        count++;
      });
    });
  });

  Logger.log("Prompt to Gemini:\n" + prompt);
  return prompt;
}

function callGeminiAPI(promptText) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: promptText
          }
        ]
      }
    ]
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    } else {
      Logger.log("Gemini API response:\n" + response.getContentText());
      return "• Gemini API returned no content. Please check your input.";
    }
  } catch (e) {
    Logger.log("Gemini API error: " + e.message);
    return `• Gemini API error: ${e.message}`;
  }
}
