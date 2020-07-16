const root_url = "https://www.usehover.com";
// const root_url = "http://localhost:3000";
let channels = [], menu = null, child_menus = [], place = 0, vars = {}, mode = "android";

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
	let display_text = menu.text;
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
		return child_menus;
}

function onStyleChange(e) { setStyle(e.target.value); }

function setStyle(newStyle) {
	$("#outer-container").removeClass(mode).addClass(newStyle);
	mode = newStyle;
	$("#ussd-box").css('margin-top', mode === "fullscreen" ? $("#screen").height()*.45 : "");
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

loadChannel();
initKeyboardShortcuts();
initClickEvents();
$("#menu-entry").focus();