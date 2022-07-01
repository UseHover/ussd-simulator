const root_url = "https://www.usehover.com";
//const root_url = "http://localhost:3000";
const djs = new DJS();
const dynamic_journey_api = "https://hover-public.s3.amazonaws.com/shoe-menu.xml";

let channel = {}, menu = null, child_menus = [], place = 0, vars = {}, mode = "android";
let dynamic_journey_menus = [], dynamic_journey_arguments = {}, dynamic_journey_menu = null, dynamic_journey_place = 0;
let arg_regex = /\$(?<argument>\w+)/g;


function load(url, callback) { $.ajax({type: "GET", url: url, success: callback, error: function() { onError("Network error"); } }); }
function loadChannel() { load(root_url + "/api/channels/1", onLoadChannel); }
function loadMenu(id) {
	$.getJSON("./menus.json", function(result) {
		menu = result.data.map(function(d) { return d.attributes; }).find(e => e.id == id);
		onLoadMenu(menu);
		loadChildren(result.data, id);
	});
}
function loadChildren(data, menu_id) { child_menus = data.map(function(d) { return d.attributes; }).filter(e => e.parent_menu_id == menu_id); }

function onLoadChannel(result) { channel = result.data.attributes; }

function onLoadMenu(m) {
	$("#menu-text").text(getText(m));
	$("#menu-entry").val("");
	if (m.response_type == "info") {
		$("#menu-entry").hide();
		$("#cancel-btn").hide();
		$("#ok-btn").click(onCancel);
	}
}

function onError(msg) { 
	$("#inline-error").text(msg);
	$("#menu-entry").val("");
	$("#menu-entry").focus();
}
function onCancel() {
	place = 0;
	if (djs.active) {
		djs.stop();
	}
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
	if (djs.active) {
		dynamicJourneySimulator();
	} else if (place === 0) {
		loadRootMenu();
	} else {
		submitResponse();
	}
	$("#menu-entry").focus();
}

function loadRootMenu() {
	if (channelExists()) {
		place = 1;
		loadMenu(channel.first_menu_id);
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

function channelExists() { return channel.root_code === $("#menu-entry").val().trim(); }
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
		return child_menus.filter(m => $("#registered-toggle").prop("checked") ? m.code !== 300 : m.code === 300);
	else
		return child_menus.filter(m => $("#registered-toggle").prop("checked") ? m.parent_index >= 0 : m.parent_index < 0);
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
	$("#dynamic-journey-file").change(loadDynamicJourney);
	
	$("#ok-btn").click(onOk);
	$("#cancel-btn").click(onCancel);
	$(".key").mousedown(keyboardInteraction);
	$(".key").mouseup(function(e) {
		e.currentTarget.classList.remove("press");
	 });
}

function loadDynamicJourney(e) {
	var file = e.target.files[0];
	if (!file) {
		return;
	}
	var reader = new FileReader();
	reader.onload = function(e) {
		var contents = e.target.result;
		try {
			djs.loadXML(contents);
		} catch(e) {
			if (e instanceof DJSException) {
				$("#inline-error").text(e.message);
			} else {
				console.error(e);
			}
		}
		
	};
	reader.readAsText(file);
}

function initiateDynamicJourneySimulator() {
	if (!djs.ready) {
		$("#inline-error").text("You need to upload a dynamic journey .xml file before you can run this simulation.");
		return;
	}
	$("#inline-error").text("");
	$("#menu-entry").val("");

	djs.start();

	dynamic_journey_menu = djs.next;

	$("#menu-text").text(dynamic_journey_menu['text']);
	$("#menu-entry").focus();
}

function dynamicJourneySimulator() {
	$("#inline-error").text("");

	choice = $("#menu-entry").val();

	if (choice === 'end') {
		djs.stop();
		$("#cancel-btn").click();
		return;
	}

	if (dynamic_journey_menu['response_type'] == "choice") {
		try {
			djs.setArgument(choice);
		} catch(e) {
			if (e instanceof DJSException) {
				$("#inline-error").text(e.message);
			} else {
				console.error(e);
			}
		}
	}

	dynamic_journey_menu = djs.next;

	$("#menu-text").text(djs.insertArguments(dynamic_journey_menu['text']));
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