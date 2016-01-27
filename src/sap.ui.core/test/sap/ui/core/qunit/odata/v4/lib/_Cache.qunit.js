/*!
 * ${copyright}
 */
sap.ui.require([
	"sap/ui/model/odata/v4/lib/_Cache",
	"sap/ui/model/odata/v4/lib/_Helper",
	"sap/ui/model/odata/v4/lib/_Requestor",
	"sap/ui/test/TestUtils"
], function (Cache, Helper, Requestor, TestUtils) {
	/*global QUnit, sinon */
	/*eslint max-nested-callbacks: 0, no-warning-comments: 0 */
	"use strict";

	var aTestData = "abcdefghijklmnopqrstuvwxyz".split("");

	function createResult(iIndex, iLength) {
		return {
			"@odata.context": "$metadata#TEAMS",
			value : aTestData.slice(iIndex, iIndex + iLength)
		};
	}

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.v4.lib._Cache", {
		beforeEach : function () {
			this.oSandbox = sinon.sandbox.create();
			this.oLogMock = this.oSandbox.mock(jQuery.sap.log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();
		},

		afterEach : function () {
			this.oSandbox.verifyAndRestore();
		}
	});

	//*********************************************************************************************
	QUnit.test("Cache is not a constructor", function (assert) {
		assert.strictEqual(typeof Cache, "object");
	});

	//*********************************************************************************************
	[
		{index: 1, length: 1, result: ["b"]},
		{index: 0, length: 2, result: ["a", "b"]},
		{index: 4, length: 5, result: []},
		{index: 1, length: 5, result: ["b", "c"]}
	].forEach(function (oFixture) {
		QUnit.test("read(" + oFixture.index + ", " + oFixture.length + ")", function (assert) {
			var oRequestor = Requestor.create("/~/"),
				sUrl = "/~/Employees",
				oCache = Cache.create(oRequestor, sUrl),
				oPromise,
				aData = ["a", "b", "c"],
				oMockResult = {
					"@odata.context": "$metadata#TEAMS",
					value : aData.slice(oFixture.index, oFixture.index + oFixture.length)
				};

			this.oSandbox.mock(oRequestor).expects("request")
				.withExactArgs("GET", sUrl + "?$skip=" + oFixture.index + "&$top="
					+ oFixture.length)
				.returns(Promise.resolve(oMockResult));

			// code under test
			oPromise = oCache.read(oFixture.index, oFixture.length);

			assert.ok(oPromise instanceof Promise, "returns a Promise");
			return oPromise.then(function (aResult) {
				assert.deepEqual(aResult, {
					"@odata.context": "$metadata#TEAMS",
					value : oFixture.result
				});
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("read(-1, 1)", function (assert) {
		var oRequestor = Requestor.create("/~/"),
			sUrl = "/~/Employees",
			oCache = Cache.create(oRequestor, sUrl);

		this.oSandbox.mock(oRequestor).expects("request").never();

		// code under test
		assert.throws(function () {
			oCache.read(-1, 1);
		}, new Error("Illegal index -1, must be >= 0"));
	});

	//*********************************************************************************************
	QUnit.test("read(1, -1)", function (assert) {
		var oRequestor = Requestor.create("/~/"),
			sUrl = "/~/Employees",
			oCache = Cache.create(oRequestor, sUrl);

		this.oSandbox.mock(oRequestor).expects("request").never();

		// code under test
		assert.throws(function () {
			oCache.read(1, -1);
		}, new Error("Illegal length -1, must be >= 0"));
	});

	//*********************************************************************************************
	[{
		title: "second range completely before",
		reads: [{index: 10, length: 2}, {index: 5, length: 2}],
		expectedRequests: [{skip: 10, top: 2}, {skip: 5, top: 2}]
	}, {
		title: "second range overlaps before",
		reads: [{index: 5, length: 4}, {index: 3, length: 4}],
		expectedRequests: [{skip: 5, top: 4}, {skip: 3, top: 2}]
	}, {
		title: "same range",
		reads: [{index: 1, length: 2}, {index: 1, length: 2}],
		expectedRequests: [{skip: 1, top: 2}]
	}, {
		title: "second range overlaps after",
		reads: [{index: 3, length: 4}, {index: 5, length: 4}],
		expectedRequests: [{skip: 3, top: 4}, {skip: 7, top: 2}]
	}, {
		title: "second range completely behind",
		reads: [{index: 5, length: 2}, {index: 10, length: 2}],
		expectedRequests: [{skip: 5, top: 2}, {skip: 10, top: 2}]
	}, {
		title: "second range part of first range",
		reads: [{index: 5, length: 8}, {index: 7, length: 2}],
		expectedRequests: [{skip: 5, top: 8}]
	}, {
		title: "first range part of second range",
		reads: [{index: 7, length: 2}, {index: 5, length: 6}],
		expectedRequests: [{skip: 7, top: 2}, {skip: 5, top: 2}, {skip: 9, top: 2}]
	}, {
		title: "read more than available",
		reads: [{index: 10, length: 90}, {index: 0, length: 100}],
		expectedRequests: [{skip: 10, top: 90}, {skip: 0, top: 10}]
	}, {
		title: "read exactly max available",
		reads: [{index: 0, length: 26}, {index: 26, length: 26}, {index: 26, length: 26}],
		expectedRequests: [{skip: 0, top: 26}, {skip: 26, top: 26}]
	}, {
		title: "different ranges",
		reads: [{index: 2, length: 5}, {index: 0, length: 2}, {index: 1, length: 2}],
		expectedRequests: [{skip: 2, top: 5}, {skip: 0, top: 2}]
	}].forEach(function (oFixture) {
		QUnit.test("multiple read, " + oFixture.title + " (sequentially)", function (assert) {
			var oRequestor = Requestor.create("/~/"),
				sUrl = "/~/Employees",
				oCache = Cache.create(oRequestor, sUrl),
				oPromise = Promise.resolve(),
				oRequestorMock = this.oSandbox.mock(oRequestor);

			oFixture.expectedRequests.forEach(function (oRequest) {
				oRequestorMock.expects("request")
					.withExactArgs("GET", sUrl + "?$skip=" + oRequest.skip + "&$top="
						+ oRequest.top)
					.returns(Promise.resolve(createResult(oRequest.skip, oRequest.top)));
			});

			oFixture.reads.forEach(function (oRead) {
				oPromise = oPromise.then(function () {
					 return oCache.read(oRead.index, oRead.length).then(function (oResult) {
						 assert.deepEqual(oResult, createResult(oRead.index, oRead.length));
					 });
				});
			});
			return oPromise;
		});

		QUnit.test("multiple read, " + oFixture.title + " (parallel)", function (assert) {
			var oRequestor = Requestor.create("/~/"),
				sUrl = "/~/Employees",
				oCache = Cache.create(oRequestor, sUrl),
				aPromises = [],
				oRequestorMock = this.oSandbox.mock(oRequestor);

			oFixture.expectedRequests.forEach(function (oRequest) {
				oRequestorMock.expects("request")
					.withExactArgs("GET", sUrl + "?$skip=" + oRequest.skip + "&$top="
						+ oRequest.top)
					.returns(Promise.resolve(createResult(oRequest.skip, oRequest.top)));
			});

			oFixture.reads.forEach(function (oRead) {
				aPromises.push(oCache.read(oRead.index, oRead.length).then(function (oResult) {
					assert.deepEqual(oResult, createResult(oRead.index, oRead.length));
				}));
			});
			return Promise.all(aPromises);
		});
	});

	//*********************************************************************************************
	QUnit.test("convertQueryOptions", function (assert) {
		var oCacheMock = this.mock(Cache),
			oExpand = {};

		oCacheMock.expects("convertExpand")
			.withExactArgs(sinon.match.same(oExpand)).returns("expand");

		assert.deepEqual(Cache.convertQueryOptions({
			"foo" : "bar",
			"$expand" : oExpand,
			"$select" : ["select1", "select2"]
		}), {
			"foo" : "bar",
			"$expand" : "expand",
			"$select" : "select1,select2"
		});

		assert.deepEqual(Cache.convertQueryOptions({
			"$select" : "singleSelect"
		}), {
			"$select" : "singleSelect"
		});

		assert.strictEqual(Cache.convertQueryOptions(undefined), undefined);

		["$filter", "$format", "$id", "$inlinecount", "$orderby", "$search", "$skip", "$skiptoken",
			"$top"
		].forEach(function (sSystemOption) {
			assert.throws(function () {
				var mQueryOptions = {};

				mQueryOptions[sSystemOption] = "foo";
				Cache.convertQueryOptions(mQueryOptions);
			}, new RegExp("Unsupported system query option \\" + sSystemOption));
		});
	});

	//*********************************************************************************************
	QUnit.test("convertExpandOptions", function (assert) {
		var oCacheMock = this.mock(Cache),
			oExpand = {};

		oCacheMock.expects("convertExpand")
			.withExactArgs(sinon.match.same(oExpand)).returns("expand");

		assert.strictEqual(Cache.convertExpandOptions("foo", {
			"$expand" : oExpand,
			"$select" : ["select1", "select2"]
		}), "foo($expand=expand;$select=select1,select2)");

		assert.strictEqual(Cache.convertExpandOptions("foo", {}), "foo");
	});

	//*********************************************************************************************
	QUnit.test("convertExpand", function (assert) {
		var oOptions = {};

		["Address", null].forEach(function (vValue) {
			assert.throws(function () {
				Cache.convertExpand(vValue);
			}, new Error("$expand must be a valid object"));
		});

		this.mock(Cache).expects("convertExpandOptions")
			.withExactArgs("baz", sinon.match.same(oOptions)).returns("baz(options)");

		assert.strictEqual(Cache.convertExpand({
			"foo" : true,
			"bar" : null,
			"baz" : oOptions
		}), "foo,bar,baz(options)");
	});

	//*********************************************************************************************
	QUnit.test("buildQueryString", function (assert) {
		var oCacheMock = this.mock(Cache),
			oConvertedQueryParams = {},
			oQueryParams = {};

		oCacheMock.expects("convertQueryOptions")
			.withExactArgs(undefined).returns(undefined);

		assert.strictEqual(Cache.buildQueryString(undefined), "");

		oCacheMock.expects("convertQueryOptions")
			.withExactArgs(oQueryParams).returns(oConvertedQueryParams);
		this.mock(Helper).expects("buildQuery")
			.withExactArgs(sinon.match.same(oConvertedQueryParams)).returns("?query");

		assert.strictEqual(Cache.buildQueryString(oQueryParams), "?query");
	});

	//*********************************************************************************************
	QUnit.test("buildQueryString examples", function (assert) {
		[{
			o: {foo: ["bar", "€"], $select: "IDÖ"},
			s: "foo=bar&foo=%E2%82%AC&$select=ID%C3%96"
		}, {
			o: {$select: ["ID"]},
			s: "$select=ID"
		}, {
			o: {$select: ["ID", "Name"]},
			s: "$select=ID,Name"
		}, {
			o: {$expand: {"SO_2_BP": true, "SO_2_SOITEM": true}},
			s: "$expand=SO_2_BP,SO_2_SOITEM"
		}, {
			o: {$expand: {"SO_2_BP": true, "SO_2_SOITEM": {$select: "CurrencyCode"}}},
			s: "$expand=SO_2_BP,SO_2_SOITEM($select=CurrencyCode)"
		}, {
			o: {
				$expand: {
					"SO_2_BP": true,
					"SO_2_SOITEM": {
						"$select": ["ItemPosition", "Note"]
					}
				}
			},
			s: "$expand=SO_2_BP,SO_2_SOITEM($select=ItemPosition,Note)"
		}, {
			o: {
				$expand: {
					"SO_2_BP": true,
					"SO_2_SOITEM": {
						"$expand": {
							"SOITEM_2_PRODUCT": {
								"$expand" : {
									"PRODUCT_2_BP" : true
								},
								"$select": "CurrencyCode"
							},
							"SOITEM_2_SO": true
						}
					}
				},
				"sap-client" : "003"
			},
			s: "$expand=SO_2_BP,SO_2_SOITEM($expand=SOITEM_2_PRODUCT($expand=PRODUCT_2_BP;"
				+ "$select=CurrencyCode),SOITEM_2_SO)&sap-client=003"
		}].forEach(function (oFixture) {
			assert.strictEqual(Cache.buildQueryString(oFixture.o, false), "?" + oFixture.s,
				oFixture.s);
		});
	});

	//*********************************************************************************************
	QUnit.test("query params", function (assert) {
		var oCache,
			mQueryParams = {},
			sQueryParams = "?query",
			oRequestor,
			sUrl = "/~/Employees";

		this.oSandbox.mock(Cache).expects("buildQueryString")
			.withExactArgs(sinon.match.same(mQueryParams))
			.returns(sQueryParams);

		oRequestor = Requestor.create("/~/");
		oCache = Cache.create(oRequestor, sUrl, mQueryParams);

		this.oSandbox.mock(oRequestor).expects("request")
			.withExactArgs("GET", sUrl + sQueryParams + "&$skip=0&$top=5")
			.returns(Promise.resolve({value:[]}));

		// code under test
		mQueryParams.$select = "foo"; // modification must not affect Cache
		return oCache.read(0, 5);
	});

	//*********************************************************************************************
	QUnit.test("error handling", function (assert) {
		var oError = {},
			oRequestor = Requestor.create("/~/"),
			oSuccess = createResult(0, 5),
			sUrl = "/~/Employees",
			oCache = Cache.create(oRequestor, sUrl),
			oRequestorMock = this.oSandbox.mock(oRequestor);

		oRequestorMock.expects("request")
			.withExactArgs("GET", sUrl + "?$skip=0&$top=5")
			.returns(Promise.reject(oError));
		oRequestorMock.expects("request")
			.withExactArgs("GET", sUrl + "?$skip=0&$top=5")
			.returns(Promise.resolve(oSuccess));

		// code under test
		return oCache.read(0, 5)["catch"](function (oResult1) {
			assert.strictEqual(oResult1, oError);
			return oCache.read(0, 5).then(function (oResult2) {
				assert.deepEqual(oResult2, oSuccess);
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("read single employee", function (assert) {
		var mQueryParams = {
				"sap-client" : "300"
			},
			oExpectedResult = {},
			oRequestor = Requestor.create("/~/"),
			sUrl = "/~/Employees('1')",
			oCache,
			aPromises = [];

		this.oSandbox.mock(Cache).expects("buildQueryString")
			.withExactArgs(mQueryParams).returns("?~");
		this.oSandbox.mock(oRequestor).expects("request")
			.withExactArgs("GET", sUrl + "?~")
			.returns(Promise.resolve(oExpectedResult));

		oCache = Cache.createSingle(oRequestor, sUrl, mQueryParams);
		aPromises.push(oCache.read().then(function (oResult) {
			assert.strictEqual(oResult, oExpectedResult);
		}));
		aPromises.push(oCache.read().then(function (oResult) {
			assert.strictEqual(oResult, oExpectedResult);
		}));
		return Promise.all(aPromises);
	});

	//*********************************************************************************************
	if (TestUtils.isRealOData()) {
		QUnit.test("read single employee (real OData)", function (assert) {
			var oExpectedResult = {
					"@odata.context": "$metadata#TEAMS/$entity",
					"Team_Id": "TEAM_01",
					Name: "Business Suite",
					MEMBER_COUNT: 2,
					MANAGER_ID: "3",
					BudgetCurrency: "USD",
					Budget: 555.55
				},
				oRequestor = Requestor.create("/sap/opu/local_v4/IWBEP/TEA_BUSI"),
				sUrl = TestUtils.proxy("/sap/opu/local_v4/IWBEP/TEA_BUSI/TEAMS('TEAM_01')"),
				oCache = Cache.createSingle(oRequestor, sUrl);

			return oCache.read().then(function (oResult) {
				assert.deepEqual(oResult, oExpectedResult);
			});
		});
	}

	//*********************************************************************************************
	QUnit.test("SingleCache.refresh - basics", function (assert) {
		var oCache,
			oPromise,
			oRequestor = Requestor.create("/~/"),
			sUrl = "/~/Employees('1')";

		this.oSandbox.mock(oRequestor).expects("request").withExactArgs("GET", sUrl)
			.returns(Promise.resolve({}));

		oCache = Cache.createSingle(oRequestor, sUrl);
		oPromise = oCache.read();

		return oPromise.then(function () {
			assert.strictEqual(oCache.oPromise, oPromise, "Promise is cached");

			oCache.refresh();
			assert.strictEqual(oCache.oPromise, undefined, "Cached promise is cleared");
		});
	});

	//*********************************************************************************************
	QUnit.test("SingleCache.refresh - cancel pending requests", function (assert) {
		var oCache,
			aPromises = [],
			oRequestor = Requestor.create("/~/"),
			sUrl = "/~/Employees('1')";

		this.oSandbox.mock(oRequestor).expects("request").twice()
			.withExactArgs("GET", sUrl)
			.onFirstCall().returns(Promise.resolve({}))
			.onSecondCall().returns(Promise.resolve({}));

		oCache = Cache.createSingle(oRequestor, sUrl);

		aPromises.push(oCache.read().then(function () {
			assert.ok(false, "Refresh shall cancel this read");
		})["catch"](function (oError) {
			assert.strictEqual(oError.canceled, true, "Canceled error thrown");
			assert.strictEqual(oError.message,
				"Refresh canceled processing of pending request: /~/Employees('1')");
		}));

		oCache.refresh();
		// a read after refresh triggers a second request; if read fails test framework protocols
		// the failure: Promise rejected during SingleCache.refresh...
		aPromises.push(oCache.read());
		return Promise.all(aPromises);
	});

	//*********************************************************************************************
	QUnit.test("Cache.refresh - basics", function (assert) {
		var oCache,
			oRequestor = Requestor.create("/~/"),
			sUrl = "/~/Employees";

		this.oSandbox.mock(oRequestor).expects("request")
			.withExactArgs("GET", sUrl + "?$skip=0&$top=20")
			.returns(Promise.resolve(createResult(0, 10)));

		oCache = Cache.create(oRequestor, sUrl);

		// read 20 but receive only 10 to simulate a short read to set iMaxElements
		return oCache.read(0, 20).then(function () {
			var aElements = oCache.aElements;

			oCache.refresh();
			assert.strictEqual(oCache.sContext, undefined, "sContext after refresh");
			assert.strictEqual(oCache.iMaxElements, -1, "iMaxElements after refresh");
			assert.strictEqual(oCache.aElements.length, 0, "aElements after refresh");
			assert.notStrictEqual(oCache.aElements, aElements,
				"different aElements arrays after refresh");
		});
	});

	//*********************************************************************************************
	QUnit.test("Cache.refresh - cancel pending requests", function (assert) {
		var oCache,
			aPromises = [],
			oRequestor = Requestor.create("/~/"),
			sUrl = "/~/Employees";

		this.oSandbox.mock(oRequestor).expects("request").twice()
			.withExactArgs("GET", sUrl + "?$skip=0&$top=10")
			.returns(Promise.resolve(createResult(0, 10)));

		oCache = Cache.create(oRequestor, sUrl);

		aPromises.push(oCache.read(0, 10).then(function () {
			assert.ok(false, "Refresh shall cancel this read");
		})["catch"](function (oError) {
			assert.strictEqual(oError.canceled, true, "Canceled error thrown");
			assert.strictEqual(oError.message,
				"Refresh canceled processing of pending request: /~/Employees?$skip=0&$top=10");
			// Elements for read after refresh must not be removed from the elements array
			assert.strictEqual(oCache.aElements[9], "j", "elements array must not be cleared");
		}));

		oCache.refresh();
		// a read after refresh triggers a second request; if read fails test framework protocols
		// the failure: Promise rejected during Cache.refresh...
		aPromises.push(oCache.read(0, 10));
		return Promise.all(aPromises);
	});

	//*********************************************************************************************
	QUnit.test("Cache.toString", function (assert) {
		var oCache,
			oRequestor = Requestor.create("/~/"),
			mQueryParams = {"$select": "ID"},
			sUrl = "/~/Employees",
			sUrlSingle = "/~/Employees('1')";

		oCache = Cache.create(oRequestor, sUrl, mQueryParams);
		assert.strictEqual(oCache.toString(), sUrl + "?$select=ID&");

		oCache = Cache.createSingle(oRequestor, sUrlSingle);
		assert.strictEqual(oCache.toString(), sUrlSingle);

	});
});