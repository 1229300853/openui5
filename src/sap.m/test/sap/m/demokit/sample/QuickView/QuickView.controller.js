sap.ui.define([
	'jquery.sap.global',
	'sap/ui/core/Fragment',
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/json/JSONModel'
], function (jQuery, Fragment, Controller, JSONModel) {
	"use strict";

	var CController = Controller.extend("sap.m.sample.QuickView.QuickView", {

		// create JSON model instance
		oCompanyModel: new JSONModel(),
		oEmployeeModel: new JSONModel(),
		oGenericModel: new JSONModel(),
		onInit: function () {
			// JSON sample data
			var mCompanyData = {
				cards: [
					{
						cardId: "companyCardId",
						header: "Company info",
						title: "Adventure Company",
						titleUrl: "http://sap.com",
						icon: "sap-icon://building",
						description: "John Doe",
						groups: [
							{
								heading: "Contact Details",
								elements: [
									{
										label: "Phone",
										value: "+001 6101 34869-0",
										elementType: sap.m.QuickViewGroupElementType.phone
									},
									{
										label: "Address",
										value: "550 Larkin Street, 4F, Mountain View, CA, 94102 San Francisco USA",
										elementType: sap.m.QuickViewGroupElementType.text
									}
								]
							},
							{
								heading: "Main Contact",
								elements: [
									{
										label: "Name",
										value: "John Doe",
										elementType: sap.m.QuickViewGroupElementType.cardLink,
										cardLinkId: "companyEmployeeCardId"
									},
									{
										label: "Mobile",
										value: "+001 6101 34869-0",
										elementType: sap.m.QuickViewGroupElementType.mobile
									},
									{
										label: "Phone",
										value: "+001 6101 34869-0",
										elementType: sap.m.QuickViewGroupElementType.phone
									},
									{
										label: "Email",
										value: "main.contact@company.com",
										elementType: sap.m.QuickViewGroupElementType.email
									}
								]
							}
						]
					},
					{
						cardId: "companyEmployeeCardId",
						header: "Employee Info",
						title: "John Doe",
						icon: "sap-icon://person-placeholder",
						description: "Department Manager",
						groups: [
							{
								heading: "Company",
								elements: [
									{
										label: "Name",
										value: "Adventure Company",
										url: "http://sap.com",
										elementType: sap.m.QuickViewGroupElementType.link
									},
									{
										label: "Address",
										value: "Sofia, Boris III, 136A"
									},
									{
										label: "Slogan",
										value: "Innovation through technology"
									}
								]
							},
							{
								heading: "Other",
								elements: [
									{
										label: "Email",
										value: "john.doe@sap.com",
										elementType: sap.m.QuickViewGroupElementType.email
									},
									{
										label: "Phone",
										value: "+359 888 888 888",
										elementType: sap.m.QuickViewGroupElementType.phone
									}
								]
							}
						]
					}
				]
			};

			var mEmployeeData = {
				cards: [
					{
						cardId: "employeeCardId",
						header: "Employee Info",
						icon: "test-resources/sap/ui/demokit/explored/img/johnDoe.png",
						title: "Michael Muller",
						description: "Account Manager",
						groups: [
							{
								heading: "Contact Details",
								elements: [
									{
										label: "Mobile",
										value: "+001 6101 34869-0",
										elementType: sap.m.QuickViewGroupElementType.mobile
									},
									{
										label: "Phone",
										value: "+001 6101 34869-1",
										elementType: sap.m.QuickViewGroupElementType.phone
									},
									{
										label: "Email",
										value: "main.contact@company.com",
										elementType: sap.m.QuickViewGroupElementType.email
									}
								]
							},
							{
								heading: "Company",
								elements: [
									{
										label: "Name",
										value: "Adventure Company",
										url: "http://sap.com",
										type: sap.m.QuickViewGroupElementType.link
									},
									{
										label: "Address",
										value: "Main Street 4572, Los Angeles USA"
									}
								]
							}
						]
					}
				]
			};

			var mGenericData = {
				cards: [
					{
						cardId: "genericCardId",
						header: "Process",
						title: "Inventarisation",
						titleUrl: "http://de.wikipedia.org/wiki/Inventarisation",
						icon: "sap-icon://camera",
						groups: [
							{
								elements: [
									{
										label: "Start Date",
										value: "01/01/2015"
									},
									{
										label: "End Date",
										value: "31/12/2015"
									},
									{
										label: "Occurrence",
										value: "Weekly"
									}
								]
							}
						]
					}
				]
			}

			// set the data for the model
			this.oCompanyModel.setData(mCompanyData);
			this.oEmployeeModel.setData(mEmployeeData);
			this.oGenericModel.setData(mGenericData);
		},

		onAfterRendering: function () {
			var oButton = this.getView().byId('showQuickView');
			oButton.$().attr('aria-haspopup', true);

			oButton = this.getView().byId('employeeQuickView');
			oButton.$().attr('aria-haspopup', true);

			oButton = this.getView().byId('genericQuickView');
			oButton.$().attr('aria-haspopup', true);
		},

		handleCompanyQuickViewPress: function (oEvent) {
			this.createPopover();

			this._oQuickView.setModel(this.oCompanyModel);

			this._oQuickView.openBy(oEvent.getSource());
		},

		handleEmployeeQuickViewPress: function (oEvent) {
			this.createPopover();

			this._oQuickView.setModel(this.oEmployeeModel);

			this._oQuickView.openBy(oEvent.getSource());
		},

		handleGenericQuickViewPress: function (oEvent) {
			this.createPopover();

			this._oQuickView.setModel(this.oGenericModel);

			this._oQuickView.openBy(oEvent.getSource());
		},

		createPopover: function() {
			if (!this._oQuickView) {
				this._oQuickView = sap.ui.xmlfragment("sap.m.sample.QuickView.QuickView", this);
				this.getView().addDependent(this._oQuickView);
			}
		},

		onExit: function () {
			if (this._oQuickView) {
				this._oQuickView.destroy();
			}
		}
	});


	return CController;

});
