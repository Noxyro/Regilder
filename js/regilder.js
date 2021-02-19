let LIB_PAKO = window.pako;
let HASH_ZLIB = "7a990d405d2c6fb93aa8fbb0ec1a3b23";

let HERO_NAMES=[
  "Cid, the Helpful Adventurer",
  "Treebeast",
  "Ivan, the Drunken Brawler",
  "Brittany, Beach Princess",
  "The Wandering Fisherman",
  "Betty Clicker",
  "The Masked Samurai",
  "Leon",
  "The Great Forest Seer",
  "Alexa, Assassin",
  "Natalia, Ice Apprentice",
  "Mercedes, Duchess of Blades",
  "Bobby, Bounty Hunter",
  "Broyle Lindeoven, Fire Mage",
  "Sir George II, King's Guard",
  "King Midas",
  "Referi Jerator, Ice Wizard",
  "Abaddon",
  "Ma Zhu",
  "Amenhotep",
  "Beastlord",
  "Athena, Goddess of War",
  "Aphrodite, Goddess of Love",
  "Shinatobe, Wind Deity",
  "Grant, The General",
  "Frostleaf",
  "Dread Knight",
  "Atlas",
  "Terra"
  ];

let HERO_NAMES_SHORT=[
  "Cid",
  "Treebeast",
  "Ivan",
  "Brittany",
  "Fisherman",
  "Betty",
  "Samurai",
  "Leon",
  "Forest Seer",
  "Alexa",
  "Natalia",
  "Mercedes",
  "Bobby",
  "Broyle",
  "Sir George",
  "King Midas",
  "Referi",
  "Abaddon",
  "Ma Zhu",
  "Amenhotep",
  "Beastlord",
  "Athena",
  "Aphrodite",
  "Shinatobe",
  "Grant",
  "Frostleaf",
  "Dread Knight",
  "Atlas",
  "Terra"
];

let MESSAGE_STRINGS = {
  "error": {
    "system": {
      0: "Missing message element in document.",
      1: "Missing text input element in document.",
    },
    "read": {
      0: "Input is empty.",
      1: "Invalid input.",
      2: "Unable to process input.",
      3: "Unable to process input.",
      4: "Unable to process input.",
      5: "Not a savegame.",
      6: "Unsupported savegame."
    }
  }
};

let data = null;
let debug = false;

let saveDataMessageElement = document.getElementById("savedata-message");
let saveDataTextInputElement = document.getElementById("savedata-input");

let views;

function registerView(id, view) {
  if (views == null) {
    views = {};
  }

  if (id == null || id === "" || view == null) {
    return;
  }

  views[id] = view;
}

function registerViews(views) {
  if (views == null) {
    return;
  }

  if (views.length === 0) {
    return;
  }

  let element;
  for (let i = 0; i < views.length; i++) {
    let id = i;

    if (views[i].id != null && views[i].id !== "") {
      id = views[i].id;
    }

    registerView(id, views[i]);
  }
}

! function() {
  registerViews(document.getElementsByClassName("view"));
  switchView("savedata");
}();



/*
 * ID to name getter functions
 */
function getNameFromId(id, nameSource) {
  if (id == null || id <= 0) {
    return nameSource[0];
  }

  return nameSource[id - 1];
}

function getHeroName(id) {
  return getNameFromId(id, HERO_NAMES);
}

function getShortHeroName(id) {
  return getNameFromId(id, HERO_NAMES_SHORT);
}

function getNamesFromIds(idArray, nameSource) {
  let nameArray = [];
  if (idArray == null || idArray.length === 0) {
    return
  }

  for (let i = 0; i < idArray.length; i++) {
    nameArray[i] = getNameFromId(idArray[i], nameSource);
  }

  return nameArray;
}

function getHeroNames(idArray) {
  return getNamesFromIds(idArray, HERO_NAMES);
}

function getShortHeroNames(idArray) {
  return getNamesFromIds(idArray, HERO_NAMES_SHORT);
}

/*
 * Message helper functions
 */
function getMessageString(type, category, id) {
  if (type == null || type === "" || category == null || category === "" || id == null || id < 0) {
    return "[null message]";
  }

  if (MESSAGE_STRINGS[type] == null || MESSAGE_STRINGS[type][category] == null || MESSAGE_STRINGS[type][category][id] == null) {
    return "[undefined message]";
  }

  return MESSAGE_STRINGS[type][category][id];
}

function getErrorMessage(category, id) {
  return getMessageString("error", category, id) + " (" + category + " error " + id + ")";
}

/*
 * Savegame validation and JSON conversion function
 */
function readSavegame(saveGame) {
  if (saveGame == null || saveGame.length === 0 || saveGame === "") {
    if (debug) { console.log("Save data is empty."); return; }
    throw getErrorMessage("read", 0);
  }

  if (!saveGame.startsWith(HASH_ZLIB)) {
    if (debug) { console.log("No zlib hash found."); return; }
    throw getErrorMessage("read", 1);
  }

  let rawData = saveGame.substr(32);
  if (debug) { console.log("Savegame without hash: " + rawData); }

  let decodedData;
  try {
    decodedData = atob(rawData);
  } catch (error) {
    if (debug) { console.log("An error occurred during decoding:\n" + error.message); return; }
    throw getErrorMessage("read", 2);
  }

  if (debug) { console.log("Decoded data: " + decodedData); }

  let decompressedData;
  try {
    decompressedData = LIB_PAKO.inflate(decodedData, { to: 'string'});
  } catch (error) {
    if (debug) { console.log("An error occurred during decompression:\n" + error.message); return; }
    throw getErrorMessage("read", 3);
  }

  if (debug) { console.log("Decompressed data: " + decompressedData); }

  let jsonData;
  try {
    jsonData = JSON.parse(decompressedData);
  } catch (error) {
    if (debug) { console.log("An error occurred during parsing:\n" + error.message); return; }
    throw getErrorMessage("read", 4);
  }

  if (debug) { console.log("JSON Data: " + jsonData); }

  if (jsonData == null) {
    if (debug) { console.log("The decompressed data could not be parsed as JSON."); return; }
    throw getErrorMessage("read", 5);
  }

  let patchNumber = jsonData["readPatchNumber"];
  let versionNumber = jsonData["version"];
  if (debug) { console.log("Patch: " + patchNumber + " | Version: " + versionNumber); }

  if (patchNumber !== "1.0e11" || versionNumber !== 7) {
    if (debug) { console.log("The savegame patch version is not supported."); return; }
    throw getErrorMessage("read", 6);
  }

  if (debug) { console.log("Savegame successfully read."); }
  return jsonData;
}

/*
 * Gets the highest hero seen (first locked / not yet purchasable hero) of the savegame
 */
function getHighestHeroSeen() {
  if (data == null) {
    console.log("Invalid data. Data is null.");
    return;
  }

  let heroCollection = data["heroCollection"];
  if (heroCollection == null) {
    console.log("Invalid data. No heroCollection found.");
    return;
  }

  let heroes = heroCollection["heroes"];
  if (heroes == null) {
    console.log("Invalid data. No heroes found in heroCollection.");
    return;
  }

  if (debug) { console.log("Heroes: " + JSON.stringify(data["heroCollection"]["heroes"])); }

  for (let hero in heroes) {
    if (debug) { console.log("Hero: " + JSON.stringify(heroes[hero])); }
    if (heroes[hero]["locked"] === true) {
      return heroes[hero]["id"];
    }
  }

  return null;
}

/*
 * Gets the next seed with given previous seed. Based on the original game formula.
 */
function getNextSeed(seed) {
  return seed * 16807 % 2147483647;
}

/*
 * Gets the next gild with given seed and highest hero seen. Based on the original game formula.
 */
function getNextGild(seed, highestHeroSeen) {
  return seed % (highestHeroSeen - 1) + 2;
}

/*
 * Calculates the next number of gilds. Based on the original game formula.
 */
function calculateNextGilds(num) {
  if (data == null) {
    console.log("Invalid data. Data is null.");
    return;
  }

  let seed = data["epicHeroSeed"];
  if (seed == null || seed === 0) {
    console.log("Invalid data. No epicHeroSeed found.");
    return;
  }

  let highestHeroSeen = getHighestHeroSeen();
  if (highestHeroSeen == null || highestHeroSeen === 0) {
    console.log("Invalid data. No highest hero found.");
    return;
  }

  if (debug) { console.log("Seed: " + seed + " | " + "Highest Hero Seen: " + highestHeroSeen); }

  let gild;
  let nextGilds = [];
  for (let i = 0; i < num; i++) {
    seed = getNextSeed(seed);
    if (debug) { console.log("Next seed: " + seed); }
    gild = getNextGild(seed, highestHeroSeen);
    if (debug) { console.log("Next gild: " + gild); }
    nextGilds[i] = gild;
  }

  console.log("Next gilds: " + JSON.stringify(getShortHeroNames(nextGilds)));
  return nextGilds;
}

function switchView(view) {
  for (let v in views) {
    try {
      setElementDisplay(views[v], "none");
    } catch (error) {}
  }

  try {
    setElementDisplay(views[view], "flex");
  } catch (error) {}
}

function switchViewToRegilder() {
  calculateNextGilds(10);
  switchView("regilder");
}

/*
 * HTML helper functions
 */
function setElementStyleProperty(element, property, value) {
  if (element == null || element.style == null || property == null || property === "") {
    return;
  }

  element.style.setProperty(property, value);
}

function setElementDisplay(element, value) {
  setElementStyleProperty(element, "display", value);
}

function displayMessage(text, color) {
  if (saveDataMessageElement == null) {
    console.log(getErrorMessage("system", 0));
    return;
  }

  setElementDisplay(saveDataMessageElement, "block");
  setElementStyleProperty(saveDataMessageElement, "color", color);
  saveDataMessageElement.innerHTML = text;
}

function hideMessage() {
  if (saveDataMessageElement == null) {
    console.log(getErrorMessage("system", 0));
    return;
  }

  setElementDisplay(saveDataMessageElement,"none");
  saveDataMessageElement.innerHTML = "";
}

function processTextInput() {
  hideMessage();

  if (saveDataTextInputElement == null) {
    if (debug) { console.log("No text input element found."); }
    displayMessage(getErrorMessage("system", 1), "#00FF00");
    return;
  }

  let textInput = saveDataTextInputElement.value;
  if (debug) { console.log("Given input: " + textInput); }

  let saveGame;
  try {
    saveGame = readSavegame(textInput);
  } catch (e) {
    displayMessage(e, "#FF0000");
    return;
  }

  displayMessage("Validated.", "#00FF00");
  data = saveGame;

  setTimeout(switchViewToRegilder, 1000)
}
