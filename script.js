const root_url = "https://www.usehover.com";
const dynamic_journey_api = "https://hover-public.s3.amazonaws.com/shoe-menu.xml";
// const root_url = "http://localhost:3000";
let channels = [], menu = null, child_menus = [], place = 0, vars = {}, mode = "android";
let dynamic_journey = {}, dynamic_journey_menus = [], dynamic_journey_arguments = [], dynamic_journey_menu = null, dynamic_journey_place = 0;

function load(url, callback) { $.ajax({type: "GET", url: url, success: callback, error: function() { onError("Network error"); } }); }
function loadChannel() { load(root_url + "/api/channels/", onLoadChannel); }
function loadMenu(id) {
	load(root_url + "/api/menus/" + id, onLoadMenu);  
	loadChildren(id);
}
function loadChildren(menu_id) { load(root_url + "/api/menus?parent_id=" + menu_id, onLoadChildren); }

function onLoadChannel(result) { channels = result.data.map(function(d) { return d.attributes; }); }

function onLoadMenu(result) {
	menu = result.data.attributes;
	$("#menu-text").text(getText(menu));
	$("#menu-entry").val("");
	if (menu.response_type == "info") {
		$("#menu-entry").hide();
		$("#cancel-btn").hide();
		$("#ok-btn").click(onCancel);
	}
}

function onLoadChildren(result) {
	child_menus = result.data.map(function(d) { return d.attributes; });
}

function onError(msg) { 
	$("#inline-error").text(msg);
	$("#menu-entry").val("");
	$("#menu-entry").focus();
}
function onCancel() { 
	place = 0;
	$("#menu-text").text("Dial Short Code");
	$("#menu-entry").show();
	$("#cancel-btn").show();
	onError("");
}

function getText(menu) {
	let display_text = menu.sample;
	for (const property in vars) {
		display_text = display_text.replace("(?<" + property + ">)", vars[property]);
	}
	return display_text;
}

function onOk() {
	$("#inline-error").text("");
	if (place === 0) { loadRootMenu();
	} else { submitResponse(); }
	$("#menu-entry").focus();
}

function loadRootMenu() {
	if (channelExists()) {
		place = 1;
		loadMenu(channelExists().first_menu_id);
	} else {
		onError("Short code does not exist");
	}
}

function submitResponse() {
	if ((menu.response_type === "choice" || menu.response_type === "info") && submenuExists()) {
		loadMenu(submenuExists().id);
	} else if ($("#menu-entry").val().trim() === "0" && menu.response_type === "choice" && !submenuExists() && menu.parent_menu_id !== null) { // back
		loadMenu(menu.parent_menu_id);
	} else if (menu.response_type === "variable" || menu.response_type === "pin") {
		submitVar(menu.response_var, $("#menu-entry").val().trim());
	} else { onError("Invalid option or missing data"); }
}

function channelExists() { return channels.find(el => el.root_code === $("#menu-entry").val().trim()); }
function submenuExists() { return child_menus.find(el => el.parent_index.toString() === $("#menu-entry").val().trim()); }

function submitVar(key, entry) {
	if (!menu.valid_response_regex || entry.match(menu.valid_response_regex)) {
		vars[key] = entry;
		if (child_menus.length > 0) {
			child = child_menus[0];
			if (child_menus.length > 1) {
				child = getStateDependantChildren()[0];
			}
			loadMenu(child.id);
		} else {
			$("#menu-text").text("Request submitted, please wait for response.");
			$("#menu-entry").hide();
			$("#cancel-btn").hide();
			$("#ok-btn").click(onCancel);
		}
	} else if (menu.valid_response_regex) {
		onError("Invalid entry, must be format: " + menu.valid_response_regex);
	} else { onError("Invalid entry or missing data."); }
}

function getStateDependantChildren() {
	if (child_menus[0].code)
		return child_menus.filter(menu => $("#registered-toggle").prop("checked") ? menu.code !== 300 : menu.code === 300);
	else
		return child_menus.filter(menu => $("#registered-toggle").prop("checked") ? menu.parent_index >= 0 : menu.parent_index < 0);
}

function onStyleChange(e) { setStyle(e.target.value); }

function setStyle(newStyle) {
	$("#outer-container").removeClass(mode).addClass(newStyle);
	mode = newStyle;
	$("#ussd-box").css('margin-top', mode === "fullscreen" ? $("#screen").height()*.45 : "");
	if (mode === "fullscreen") {
		$("#meta-controls").hide();
	} else {
		$("#meta-controls").show();
	}
	
	$("#menu-entry").focus();
}

function toggleFullscreen(e) {
	setStyle("android");
	$("#phone-type").val("android").trigger("change");
}

function keyboardInteraction(e) {
	e.currentTarget.classList.add("press");
	if (e.currentTarget.attributes.key)  {
		newInput = $("#menu-entry").val() + e.currentTarget.attributes.key.value;
		$("#menu-entry").val(newInput);
	}

	if (e.currentTarget.attributes.function){
		functionButton = e.currentTarget.attributes.function.value;
		switch (functionButton) {
			case "ok":
				$("#ok-btn").click();
				break;
			case "cancel":
				$("#cancel-btn").click();
				break;
			case "backspace":
				$("#menu-entry").val($("#menu-entry").val().slice(0,-1));
				break;
			default:
				console.log("Button function not defined:", functionButton);
		}
	}
 }

function collectionsSimulator(){
	$("#collections-error").text("");
	$("#inline-error").text("");
	$("#menu-entry").val("");
	merchantId = $("#merchant-id").val();
	amount = $("#amount").val();

	if (merchantId == "" && amount == ""){
		$("#collections-error").text("Fill out the merchant ID and amount before running the simulation");
		return
	}
	msg = "".concat("Merchant ",merchantId, " has initiated a debit of UGX ", amount, " from your MM account. Enter PIN")

	$("#menu-text").text(msg);
	$("#ok-btn").click(showCollectionsApproval);
	$("#menu-entry").focus();
}

function showCollectionsApproval() {
	merchantId = $("#merchant-id").val();
	amount = $("#amount").val();

	msg = "".concat("You have approved debit of UGX ", amount, " initiated by ", merchantId, ". Transaction ID ", Date.now());
	$("#menu-text").text(msg);
	$("#inline-error").text("");
	$("#menu-entry").hide();
	$("#cancel-btn").hide();
	$("#ok-btn").click(onCancel);
	$("#menu-entry").focus();
}

function initKeyboardShortcuts() {
	$("#menu-entry").keyup(function (e) { 
		if (e.which == 13) { onOk(); 
		} else if (e.which == 27) { onCancel(); }
	});
}

function initClickEvents() {
	$("#collections-sim-btn").click(collectionsSimulator);
	$("#dynamic-journey-sim-btn").click(initiateDynamicJourneySimulator);
	
	$(".fullscreen-btn").click(toggleFullscreen);
	$("#phone-type").select2({minimumResultsForSearch: Infinity});
	$("#phone-type").change(onStyleChange);
	
	$("#ok-btn").click(onOk);
	$("#cancel-btn").click(onCancel);
	$(".key").mousedown(keyboardInteraction);
	$(".key").mouseup(function(e) {
		e.currentTarget.classList.remove("press");
	 });
}

function loadDynamicJourney() {
	xhr = new XMLHttpRequest();
	xhr.responseType = 'text';
	xhr.overrideMimeType('text/xml');
	xhr.open("GET", dynamic_journey_api);
	xhr.onload = function () {
	  if (xhr.readyState === xhr.DONE && xhr.status === 200) {
	    parseXML(xhr.responseText);
	  }
	};

	xhr.send();
}

function parseXML(xml) {
	options = {
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
	dynamic_journey = parser.parse(xml,options);
	instructions = dynamic_journey["ns0:createjourneyrequest"]["journeydefinition"]["instructions"]
	buildDynamicJourneyMenu(instructions);
}

function buildDynamicJourneyMenu(instructions) {
	if ('options' in instructions) {
		let menu = {'text': '', 'options': []};
		options = instructions['options']
		menu['text'] = `${options["header"]["texts"]["text"]["attr"]["@_text"]}\n\n`;
		
		optionslist = options['optionslist'];

		for (i in optionslist['option']) {
			option = optionslist['option'][i];
			menu['text'] = `${menu['text']}${i}. ${option["display"]["texts"]["text"]["attr"]["@_text"]}\n`;
			submenu = {'text': '', 'options': []}
			submenu_instructions = option["instructions"][1]["options"];
			submenu_arguments = option["instructions"][0]["argument"]["attr"];
			submenu['arguments'] = submenu_arguments;
			submenu['text'] = `${submenu_instructions["header"]["texts"]["text"]["attr"]["@_text"]}\n\n`;

			for (j in submenu_instructions['optionslist']['option']) {
				submenu_option = submenu_instructions['optionslist']['option'][j];
				console.log(j, submenu_option);
				submenu['text'] = `${submenu['text']}${j}. ${ submenu_option['display']['texts']['text']['attr']['@_text']}\n`;
				
				submenu['options'][j] = {};
				submenu['options'][j]['arguments'] = submenu_option['instructions']['argument']['attr'];
			}

			menu['options'][i] = submenu;
		}
		dynamic_journey_menus.push(menu);
	}

	if ('instructions' in instructions) {
		let menu = {'text': '', 'options': []};
		option = instructions["instructions"]["options"];
		menu['text'] = `${option['header']['text']['attr']['@_text']}\n\n`;
		for (i in option['option']) {
			submenu_option = option['option'][i];
			menu['text'] = `${menu['text']}${i}. ${submenu_option['display']['text']['attr']['@_text']}\n`;
			menu['options'][i] = { 'text': submenu_option['instructions']['response']['texts']['text']['attr']['@_text'], 'end': true };
		}
		dynamic_journey_menus.push(menu);
	}
	console.log(dynamic_journey_menus);	
}

function initiateDynamicJourneySimulator() {
	$("#inline-error").text("");
	$("#menu-entry").val("");
	$("#ok-btn").off("click");
	$("#ok-btn").click(dynamicJourneySimulator);

	dynamic_journey_menu = dynamic_journey_menus[dynamic_journey_place];

	$("#menu-text").text(dynamic_journey_menu['text']);
	$("#menu-entry").focus();
}

function dynamicJourneySimulator() {
	$("#inline-error").text("");

	choice = $("#menu-entry").val();

	if (choice === 'end') {
		dynamic_journey_place = 0;
		$("#ok-btn").off("click");
		$("#ok-btn").click(onOk);
		$("#cancel-btn").click();
		return;
	}

	if (choice in dynamic_journey_menu['options']) {
		dynamic_journey_menu = dynamic_journey_menu['options'][choice];
		dynamic_journey_arguments.push(dynamic_journey_menu['arguments']);

		if (!('text' in dynamic_journey_menu)) {
			dynamic_journey_place++;
			dynamic_journey_menu = dynamic_journey_menus[dynamic_journey_place];
		}
	} else {
		$("#inline-error").text("Invalid option");
	}

	

	$("#menu-text").text(dynamic_journey_menu['text']);
	$("#menu-entry").val("");
	if ('end' in dynamic_journey_menu) {
		$("#menu-entry").hide();
		$("#menu-entry").val("end");
	}
	$("#menu-entry").focus();
}

loadChannel();
initKeyboardShortcuts();
initClickEvents();
$("#menu-entry").focus();
loadDynamicJourney();