let LIB_PAKO = window.pako;
let HASH_ZLIB = "7a990d405d2c6fb93aa8fbb0ec1a3b23";
let HASH_DEFLATE = "7e8bb5a89f2842ac4af01b3b7e228592";

let MESSAGE_STRINGS = {
  "error": {
    "system": {
      0: "Missing element in document.",
      1: "Missing message element in document.",
      2: "Missing text input element in document.",
      3: "Missing loading element in document."
    },
    "read": {
      0: "Input is empty.",
      1: "Invalid input.",
      2: "Unable to process input.",
      3: "Unable to process input.",
      4: "Unable to process input.",
      5: "Not a savegame.",
      6: "Unsupported savegame.",
      7: "Error in hero data."
    },
    "data": {
      0: "Invalid data. Data is null."
    }
  },
  "generic": {
    "savedata": {
      0: "Savedata validated."
    }
  }
};

let saveData = null;
let heroData = null;
let debug = true;

let displayStates = {};

let loaderElement = document.getElementById("loader");
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
function getHeroName(heroId, short = 0) {
  if (heroData == null) { throw getErrorMessage("data", 0); }
  if (heroId == null || heroId < 0) {
    return heroData[0].name;
  }

  let heroName = heroData[heroId - 1].name
  if (!short) { return heroName; }

  let searchComma = heroName.indexOf(", ");
  if (searchComma) {
    return heroName.substring(0, searchComma);
  }

  let searchSpaces = heroName.lastIndexOf(" ");
  if (searchSpaces) {
    return heroName.substring(searchSpaces, heroName.length);
  }

  return heroName;
}

function getMultipleHeroNames(heroIdArray, short = 0) {
  let nameArray = [];
  if (heroIdArray == null || heroIdArray.length === 0) { return }

  for (let i = 0; i < heroIdArray.length; i++) {
    nameArray[i] = getHeroName(heroIdArray[i], short);
  }

  return nameArray;
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

  let hashAlgo = saveGame.startsWith(HASH_ZLIB) ? 1 : saveGame.startsWith(HASH_DEFLATE) ? 2 : 0
  if (!hashAlgo) {
    if (debug) { console.log("No compression algorithm hash found."); return; }
    throw getErrorMessage("read", 1);
  }

  let rawData = saveGame.substring(32);
  if (debug) { console.log("Savegame without hash: " + rawData); }

  let decodedData;
  try {
    decodedData = atob(rawData); // Decode Base64
  } catch (error) {
    if (debug) { console.log("An error occurred during decoding:\n" + error.message); return; }
    throw getErrorMessage("read", 2);
  }

  if (debug) { console.log("Decoded data: " + decodedData); }

  let decompressedData;
  try {
    decompressedData = hashAlgo === 2 ? LIB_PAKO.inflateRaw(decodedData, { to: 'string'}) : LIB_PAKO.inflate(decodedData, { to: 'string'});
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

  if ((!patchNumber.startsWith("1.0e11") && !patchNumber.startsWith("1.0e12")) || versionNumber !== 7) {
    if (debug) { console.log("The savegame patch version is not supported."); return; }
    throw getErrorMessage("read", 6);
  }

  heroData = JSON.parse(staticHeroData);
  if (heroData == null) {
    if (debug) { console.log("The hero data could not be loaded or read properly."); return; }
    throw getErrorMessage("read", 7);
  }

  if (debug) { console.log("Savegame successfully read."); }
  return jsonData;
}

/*
 * Gets the highest gold ever accumulated
 */
function getHighestGold() {
  if (saveData == null) {
    console.log("Invalid save data. Data is null.");
    return;
  }

  return saveData["highestGold"]
}

/*
 * Gets the highest hero seen (first locked / not yet purchasable hero) of the savegame
 */
function getHighestHeroSeen() {
  if (saveData == null) {
    console.log("Invalid save data. Data is null.");
    return 0;
  }

  if (heroData == null) {
    console.log("Invalid hero data. Data is null.");
    return 0;
  }

  let highestGoldString = getHighestGold();
  let highestGold = Number(highestGoldString.replace("e\d", "e+"))
  if (debug) { console.log("Highest gold: " + highestGold); }
  let highestHeroSeen = 0;
  for (let i = 0; i < heroData.length; i++) {
    let hero = heroData[i];
    if (hero == null) { continue; }

    let baseCost = Number(hero.baseCost);
    if (debug) { console.log("Hero: " + hero.name + " | Base cost: " + baseCost); }

    if (highestGold < baseCost) {
      highestHeroSeen = hero.id;
      break;
    }
  }
  return highestHeroSeen;
}

/*
 * Gets the next seed with given previous seed. Based on the original game formula.
 * Original definition of Random.Rand:
 *      public long Rand() { if (this.seed == 0L) throw new InvalidOperationException("Rand() called without a seed"); ++this.numUses; this.seed = this.seed * 16807L % (long) int.MaxValue; return this.seed; }
 *
 * Important part in short: this.seed = this.seed * 16807L % int.MaxValue; return this.seed;
 */
function getNextSeed(seed) {
  return seed * 16807 % 2147483647;
}

/*
 * Gets the next gild with given seed and highest hero seen. Based on the original game formula.
 * Original formula:
 *    Call to Random.Range:         key = random.Range(2U, max);
 *    Definition of Random.Range:   public float Range(float min, float max) { return (float) this.Rand() % (float) ((double) max - (double) min + 1.0) + min; }
 *      the important in short:     return this.Rand() % (max - min + 1.0) + min;
 *    Call to this.Rand() is equal to getNextSeed()
 */
function getNextGild(seed, highestHeroSeen) {
  return seed % (highestHeroSeen - 2 + 1) + 2;
}

/*
 * Calculates the next number of gilds. Based on the original game formula.
 */
function calculateNextGilds(num) {
  if (saveData == null) {
    console.log("Invalid data. Data is null.");
    return;
  }

  let seed = saveData["epicHeroSeed"];
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

  console.log("Next gilds: " + JSON.stringify(getMultipleHeroNames(nextGilds)));
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
  let nextGilds = calculateNextGilds(10);
  if (debug) { console.log("Next gilds: " + nextGilds); }
  switchView("regilder");
  for (i = 0; i < nextGilds.length; i++) {
    let listEntry = document.getElementById("regilder-output-list-entry-" + i);
    if (listEntry == null) {
      listEntry = createElement("li", "regilder-output-list-entry-" + i,);
      document.getElementById("regilder-output-list").appendChild(listEntry);
    }

    let heroName = getHeroName(nextGilds[i])
    setElementInnerHTML(listEntry, "<img src=\"favicon.ico\" alt=\"" + nextGilds[i] + "\"/> - " + heroName)
  }
}

/*
 * HTML helper functions
 */
function setElementInnerHTML(element, innerHTML) {
  element.innerHTML = innerHTML;
}

function setElementAttribute(element, attribute, value) {
  if (element == null || attribute === "") {
    return;
  }

  element.setAttribute(attribute, value);
}

function setElementStyleProperty(element, property, value) {
  if (element == null || element.style == null || property == null || property === "") {
    return;
  }

  element.style.setProperty(property, value);
}

function setElementDisplay(element, value) {
  setElementStyleProperty(element, "display", value);
}

function createElement(tagName, id = "", classList = [], innerHTML = "") {
  let element = document.createElement(tagName)
  classList.forEach((clazz) => { element.classList.add(clazz) });
  element.innerHTML = innerHTML;

  return element;
}

function removeElement(element) {
  element.parentElement.removeChild(element)
}

function showElement(element) {
  if (element == null) {
    console.log(getErrorMessage("system", 0));
    return;
  }

  console.log(JSON.stringify(displayStates));

  if (!(element.id in displayStates) || displayStates[element.id] == null || displayStates[element.id] === "") {
    element.style.removeProperty("display");
  }

  if (debug) { console.log("Showing element: " + element.id); }
  if (displayStates[element.id] === "none") {
    setElementDisplay(element, "inherit");
  } else {
    setElementDisplay(element, displayStates[element.id]);
  }

  delete displayStates[element.id];
}

function hideElement(element) {
  if (element == null) {
    console.log(getErrorMessage("system", 0));
    return;
  }

  if (!(element.id in displayStates)) {
    let displayProperty;
    if (element.style == null) {
      displayProperty = null;
    } else {
      if (element.style.getPropertyValue("display") == null || element.style.getPropertyValue("display") === "") {
        displayProperty = window.getComputedStyle(element).getPropertyValue("display")
      } else {
        displayProperty = element.style.getPropertyValue("display");
      }
    }

    displayStates[element.id] = displayProperty;
  }

  if (debug) { console.log("Hiding element: " + element.id); }
  setElementDisplay(element, "none");
}

function showMessage(messageElement, text, color) {
  if (messageElement == null) {
    console.log(getErrorMessage("system", 1));
    return;
  }

  showElement(messageElement);
  setElementStyleProperty(messageElement, "color", color);
  messageElement.innerHTML = text;
}

function hideMessage(messageElement) {
  if (messageElement == null) {
    console.log(getErrorMessage("system", 1));
    return;
  }

  hideElement(messageElement);
  messageElement.innerHTML = "";
}

function showLoader() {
  showElement(loaderElement);
}

function hideLoader() {
  hideElement(loaderElement);
}

function processSavegameInput() {
  hideMessage(saveDataMessageElement);

  if (saveDataTextInputElement == null) {
    if (debug) { console.log("No text input element found."); }
    showMessage(saveDataMessageElement, getErrorMessage("system", 2), "#00FF00");
    return;
  }

  let textInput = saveDataTextInputElement.value;
  if (debug) { console.log("Given input: " + textInput); }

  showElement(loaderElement);

  setTimeout(() => {
    let saveGame;
    try {
      saveGame = readSavegame(textInput);
    } catch (e) {
      showMessage(saveDataMessageElement, e, "#FF0000");
      return;
    } finally {
      hideElement(loaderElement);
    }

    showMessage(saveDataMessageElement, getMessageString("generic", "savedata", 0), "#00FF00");
    saveData = saveGame;

    setTimeout(switchViewToRegilder, 2000); // 2000
    setTimeout(showLoader, 1500); // 1500
    setTimeout(hideLoader, 2100); // 2100
  }, 500); // 500
}
