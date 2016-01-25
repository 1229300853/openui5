/*!
 * ${copyright}
 */
sap.ui.require([
	"sap/ui/model/odata/v4/lib/_Helper",
	"sap/ui/model/odata/v4/lib/_MetadataConverter",
	"sap/ui/model/odata/v4/lib/_MetadataRequestor",
	"sap/ui/test/TestUtils"
], function (Helper, MetadataConverter, MetadataRequestor, TestUtils) {
	/*global QUnit, sinon */
	/*eslint no-warning-comments: 0 */
	"use strict";

	var mFixture = {
			"/sap/opu/local_v4/IWBEP/TEA_BUSI/$metadata" : {source : "metadata.xml"},
			"/sap/opu/local_v4/IWBEP/TEA_BUSI/metadata.json" : {source : "metadata.json"}
		};

	/**
	 * Creates a mock for jQuery's XHR wrapper.
	 *
	 * @param {object} oPayload
	 *   the response payload
	 * @param {boolean} bFail
	 *   fail if true
	 * @returns {object}
	 *   a mock for jQuery's XHR wrapper
	 */
	function createMock(oPayload, bFail) {
		var jqXHR = new jQuery.Deferred();

		setTimeout(function () {
			if (bFail) {
				jqXHR.reject(oPayload);
			} else {
				jqXHR.resolve(oPayload);
			}
		}, 0);

		return jqXHR;
	}

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.v4.lib._MetadataRequestor", {
		beforeEach : function () {
			this.oSandbox = sinon.sandbox.create();
			TestUtils.useFakeServer(this.oSandbox, "sap/ui/core/qunit/odata/v4/data", mFixture);
			this.oLogMock = this.oSandbox.mock(jQuery.sap.log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();
		},

		afterEach : function () {
			this.oSandbox.verifyAndRestore();
		}
	});

	//*********************************************************************************************
	QUnit.test("MetadataRequestor is not a constructor", function (assert) {
		assert.strictEqual(typeof MetadataRequestor, "object");
	});

	//*********************************************************************************************
	QUnit.test("read: success", function (assert) {
		var oExpectedJson = {},
			oExpectedXml = "xml",
			oHeaders = {},
			oQueryParams = {
				"sap-client":"300"
			},
			oMetadataRequestor,
			sUrl = "/~/";

		this.oSandbox.mock(Helper).expects("buildQuery")
			.withExactArgs(sinon.match.same(oQueryParams))
			.returns("?...");

		this.oSandbox.mock(jQuery).expects("ajax")
			.withExactArgs(sUrl + "?...", {
				headers : sinon.match.same(oHeaders),
				method : "GET"
			}).returns(createMock(oExpectedXml));

		this.oSandbox.mock(MetadataConverter).expects("convertXMLMetadata")
			.withExactArgs(sinon.match.same(oExpectedXml))
			.returns(oExpectedJson);

		oMetadataRequestor = MetadataRequestor.create(oHeaders, oQueryParams);
		assert.strictEqual(typeof oMetadataRequestor, "object");

		return oMetadataRequestor.read(sUrl).then(function (oResult) {
			assert.strictEqual(oResult, oExpectedJson);
		});
	});

	//*********************************************************************************************
	QUnit.test("read: failure", function (assert) {
		var jqXHR = {},
			oExpectedError = {},
			oMetadataRequestor = MetadataRequestor.create();

		this.oSandbox.mock(jQuery).expects("ajax")
			.returns(createMock(jqXHR, true)); // true  = fail
		this.oSandbox.mock(Helper).expects("createError")
			.withExactArgs(sinon.match.same(jqXHR))
			.returns(oExpectedError);

		return oMetadataRequestor.read("/").then(function (oResult) {
			assert.ok(false);
		})
		["catch"](function(oError) {
			assert.strictEqual(oError, oExpectedError);
		});
	});

	//*********************************************************************************************
	QUnit.test("read: test service", function (assert) {
		var oMetadataRequestor = MetadataRequestor.create();

		return Promise.all([
			oMetadataRequestor.read("/sap/opu/local_v4/IWBEP/TEA_BUSI/$metadata"),
			jQuery.ajax("/sap/opu/local_v4/IWBEP/TEA_BUSI/metadata.json")
		]).then(function (aResults) {
			assert.deepEqual(aResults[0], aResults[1]);
		});
	});
});
