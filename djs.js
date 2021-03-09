// Dynamic Journey Schema parser
class DJS {
	constructor() {
		this.dynamicJourney = { 'menus': [], 'arguments': {}, 'confirmation': {}};
		this.menuIndex = 0;
		this.active = false;
	}

	get ready() {
		return this.dynamicJourney['menus'] != 0;
	}

	start() {
		this.active = true;
	}

	stop() {
		this.active = false;
		this.menuIndex = 0;
		this.dynamicJourney['arguments'] = {};
	}

	get next() {
		return this.dynamicJourney['menus'][this.menuIndex++];
	}

	setArgument(menuChoice) {
		let args = this.dynamicJourney['menus'][this.menuIndex - 1]['options'][menuChoice-1];
		this.dynamicJourney['arguments'][args['key']] = args['value'];
	}

	insertArguments(text) {
		let re = /\$\{(?<argument>\w+)\}/g;
		let match;
		while (match = re.exec(text)) {
			let key = match.groups.argument.toLocaleLowerCase();
			if(key in this.dynamicJourney['arguments']) {
				text = text.replace(match[0], this.dynamicJourney['arguments'][key]);
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
		let instructions = doc["ns0:createjourneyrequest"]["journeydefinition"]["instructions"];
		console.log("loaded instructions:", instructions);

		this.buildMenus(instructions);
	}

	buildMenus(instructions) {
		if('options' in instructions) {
			let menu = {'text': '', 'response_type': 'choice', 'options': []};
			menu['text'] = `${instructions['options']['header']['texts']['text']['textmessage']}\n\n`;
			let options = instructions['options']['optionslist']['option'];
			for(let i in options) {
				let option = options[i];
				let optionIndex = parseInt(i) + 1;
				menu['text'] = `${menu['text']}${optionIndex}. ${option['display']['texts']['text']['textmessage']}\n`;
				menu['options'][i] = option['instructions']['argument'];
			}

			if('footer' in instructions['options']) {
				menu['text'] = `${menu['text']}\n${instructions['options']['footer']['texts']['text']['textmessage']}`
			}

			this.dynamicJourney['menus'].push(menu);
		}

		if('question' in instructions) {
			let confirmation = { 'text': '' };
			confirmation['text'] = instructions['question']['display']['texts']['text']['textmessage'];
			confirmation['response_type'] = instructions['question']['key'];
			this.dynamicJourney['confirmation'] = confirmation;
		}

		if ('responsematching' in instructions) {
			let menu = { 'text': instructions['responsematching']['defaultresponse']['texts']['text']['textmessage'], 'response_type': 'info', 'end': true };
			this.dynamicJourney['menus'].push(menu);
		}
	}
}

// DJSException
function DJSException(message) {
	this.message = message;
	this.name = 'DJSException';
}