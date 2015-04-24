/*!
* ${copyright}
*/

sap.ui.define(function () {
	"use strict";

	/**
	 * MessageStrip utilities.
	 * @namespace
	 */
	var MessageStripUtilities = {};

	MessageStripUtilities.MESSAGES = {
		TYPE_NOT_SUPPORTED: "Value 'sap.ui.core.MessageType.None' for property 'type' is not supported." +
		"Defaulting to 'sap.ui.core.MessageType.Information'"
	};

	MessageStripUtilities.CLASSES = {
		ROOT: "sapMMsgStrip",
		ICON: "sapMMsgStripIcon",
		MESSAGE: "sapMMsgStripMessage",
		CLOSE_BUTTON: "sapMMsgStripCloseButton",
		CLOSING_TRANSITION: "sapMMsgStripClosing"
	};

	MessageStripUtilities.ATTRIBUTES = {
		CLOSABLE: "data-sap-ui-ms-closable"
	};

	MessageStripUtilities.RESOURCE_BUNDLE = sap.ui.getCore().getLibraryResourceBundle("sap.ui.core");

	MessageStripUtilities.setIconIfVisible = function () {
		var sIconURI;

		if (this.getShowIcon()) {
			sIconURI = MessageStripUtilities.getIconURI.call(this);
			this.setCustomIcon(sIconURI);
		}
	};

	/**
	 * Calculate the icon uri that should be set to the control property. Custom icons are allowed
	 * only when the type is sap.ui.core.MessageType.Information. Otherwise return an icon uri that
	 * is defined by the control type.
	 * @private
	 * @returns {string} the icon uri that should be set to the control property
	 */
	MessageStripUtilities.getIconURI = function () {
		var sType = this.getType(),
			sCustomIconURI = this.getCustomIcon(),
			sIconURI = "sap-icon://message-" + sType.toLowerCase();

		if (sType === sap.ui.core.MessageType.Information) {
			sIconURI = sCustomIconURI || sIconURI;
		}

		return sIconURI;
	};

	MessageStripUtilities.setAriaTypeText = function () {
		var sBundleKey = "MESSAGE_STRIP_" + this.getType().toUpperCase(),
			sAriaText = MessageStripUtilities.RESOURCE_BUNDLE.getText(sBundleKey);

		if (this.getShowCloseButton()) {
			sAriaText += " " + MessageStripUtilities.RESOURCE_BUNDLE.getText("MESSAGE_STRIP_CLOSABLE");
		}

		this.getAggregation("_ariaTypeText").setText(sAriaText);
	};

	MessageStripUtilities.handleMSCloseButtonInteraction = function (oEvent) {
		if (MessageStripUtilities.isMSCloseButtonPressed(oEvent.target)) {
			this.close();
		}
	};

	MessageStripUtilities.isMSCloseButtonPressed = function (oTarget) {
		return oTarget.className.indexOf(MessageStripUtilities.CLASSES.CLOSE_BUTTON) !== -1 ||
			oTarget.parentNode.className.indexOf(MessageStripUtilities.CLASSES.CLOSE_BUTTON) !== -1;
	};

	MessageStripUtilities.closeTransitionWithJavascript = function (fnCallback) {
		this.$().animate({opacity: 0}, {
			duration: 200,
			complete: fnCallback
		});
	};

	MessageStripUtilities.closeTransitionWithCSS = function (fnCallback) {
		this.$().addClass(MessageStripUtilities.CLASSES.CLOSING_TRANSITION)
				.one("webkitTransitionEnd transitionend", fnCallback);
	};

	MessageStripUtilities.getAccessibilityState = function () {
		var oAriaText = this.getAggregation("_ariaTypeText").toStatic(),
			mAccessibilityAttributes = {
				role: "note",
				describedby: oAriaText.getId()
			};

		return mAccessibilityAttributes;
	};

	return MessageStripUtilities;
});
