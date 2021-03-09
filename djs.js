// Dynamic Journey Schema parser
class DJS {
	constructor() {
		this.arguments = {};
		this.activeMenu = {};
		this.activeInstructions = {};
		this.active = false;
		this.end = false;
		this.finalConfirmation = {};
		this.finalResponse = {};
		this.menuIndex = 0;
		this.instructions = {}
	}

	get ready() {
		return "options" in this.activeInstructions;
	}

	start() {
		this.end = false;
		this.active = true;
	}

	stop() {
		this.active = false;
		this.menuIndex = 0;
		this.arguments = {};
		this.activeInstructions = this.instructions;
	}

	get next() {
		if (this.menuIndex != 0 && 'options' in this.activeInstructions) {
			let instructions = this.activeInstructions['options']['optionslist']['option'][this.menuIndex-1]['instructions'];
			this.activeInstructions = instructions;
		}

		this.buildMenus();
		console.log("Loading next menu:", this.activeMenu);
		return this.activeMenu;
	}

	setArgument(menuIndex) {
		this.menuIndex = menuIndex;
		let args = this.activeMenu['options'][this.menuIndex - 1];
		this.arguments[args['key'].toLocaleLowerCase()] = args['value'];
		console.log(`Argument ${args['key']} set to ${args['value']}`);
	}

	insertArguments(text) {
		let re = /\$\{(?<argument>\w+)\}/g;
		let match;
		while (match = re.exec(text)) {
			let key = match.groups.argument.toLocaleLowerCase();
			if(key in this.arguments) {
				text = text.replace(match[0], this.arguments[key]);
			}
		}
		return text;
	} 

	loadXML(xml) {
		const options = {
			attributeNamePrefix : "@_",
			attrNodeName: "attr", //default is 'false'
			textNodeName : "#text",
			ignoreAttributes : false,
			ignoreNameSpace : false,
			allowBooleanAttributes : false,
			parseNodeValue : true,
			parseAttributeValue : true,
			trimValues: true,
			cdataTagName: "__cdata", //default is 'false'
			cdataPositionChar: "\\c",
			parseTrueNumberOnly: false,
			arrayMode: false, //"strict"
			attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),//default is a=>a
			tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
			stopNodes: ["parse-me-as-string"]
		};
		let doc = parser.parse(xml,options);

		if (doc["ns0:createjourneyrequest"] === undefined) {
			console.error("Error loading xml document: document doesn't contain the ns0:createjourneyrequest node");
			throw new Error("The dynamic journey file selected does not contain the expected xml schema.");
		}
		this.instructions = doc["ns0:createjourneyrequest"]["journeydefinition"]["instructions"];
		this.activeInstructions = this.instructions;
		console.log("loaded instructions:", this.instructions);
	}

	buildMenus() {
		if ('options' in this.activeInstructions) {
			let menu = {'text': '', 'response_type': 'choice', 'options': []};
			if ('header' in this.activeInstructions['options']) {
				menu['text'] = `${this.activeInstructions['options']['header']['texts']['text']['textmessage']}\n\n`;
			}

			let options = this.activeInstructions['options']['optionslist']['option'];
			for(let i in options) {
				let option = options[i];
				let optionIndex = parseInt(i) + 1;
				menu['text'] = `${menu['text']}${optionIndex}. ${option['display']['texts']['text']['textmessage']}\n`;
				menu['options'][i] = option['instructions']['argument'];
			}

			if('footer' in this.activeInstructions['options']) {
				menu['text'] = `${menu['text']}\n${this.activeInstructions['options']['footer']['texts']['text']['textmessage']}`
			}
			console.log(`Active menu text set to ${menu['text']}`);
			console.log("Options set to ", options);

			this.activeMenu = menu;
		} else if (!this.end && 'question' in this.instructions) {
			this.end = true;
			let confirmation = { 'text': '' };
			confirmation['text'] = this.instructions['question']['display']['texts']['text']['textmessage'];
			confirmation['response_type'] = this.instructions['question']['key'];
			console.log(`Final confirmation set to ${confirmation['text']}`);
			this.activeMenu = confirmation;
		} else if ('responsematching' in this.instructions) {
			let menu = { 'text': this.instructions['responsematching']['defaultresponse']['texts']['text']['textmessage'], 'response_type': 'info', 'end': true };
			console.log(`Final response set to ${menu['text']}`);
			this.activeMenu = menu;
		} else {
			console.log("Missing final response, setting generic response.")
			let menu = { 'text': 'Your request has been received!', 'response_type': 'info', 'end': true };
			this.activeMenu = menu;
		}
	}
}

// DJSException
function DJSException(message) {
	this.message = message;
	this.name = 'DJSException';
}