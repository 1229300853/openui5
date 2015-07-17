/*!
 * ${copyright}
 */
sap.ui.require([
	"sap/ui/base/ManagedObject",
	"sap/ui/model/ChangeReason",
	"sap/ui/model/odata/v4/ODataModel"
], function (ManagedObject, ChangeReason, ODataModel) {
	/*global QUnit, sinon */
	/*eslint no-warning-comments: 0 */
	/*... max-nested-callbacks: 0 */
	"use strict";

	var TestControl = ManagedObject.extend("sap.ui.core.test.TestControl", {
			metadata: {
				properties: {
					text: "string"
				}
			}
		});

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.v4.ODataPropertyBinding", {
		beforeEach : function () {
			this.oSandbox = sinon.sandbox.create();
			this.oLogMock = this.oSandbox.mock(jQuery.sap.log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();
		},

		afterEach : function () {
			// I would consider this an API, see https://github.com/cjohansen/Sinon.JS/issues/614
			this.oSandbox.verifyAndRestore();
		},

		/**
		 * Creates a test control bound to a v4.ODataModel. Initializes the control's text property
		 * asynchronously. Waits for the value to be present and passes the property binding for
		 * "text" to the resolve handler.
		 *
		 * Note: This function mocks the model and holds the mock in this.oModelMock.
		 *
		 * @param {object} assert
		 *   the QUnit assert methods
		 * @returns {Promise}
		 *   a promise to be resolved when the control's text property has been initialized. The
		 *   resolve function passes the text binding as parameter.
		 */
		createTextBinding : function (assert) {
			var oModel = new ODataModel("/service"),
				oControl = new TestControl({models: oModel});

			this.oModelMock = this.oSandbox.mock(oModel);
			this.oModelMock.expects("read").withExactArgs("/EntitySet('foo')/property")
				.returns(Promise.resolve({value: "value"}));

			return new Promise(function (fnResolve, fnReject) {
				var oBinding;

				oControl.bindProperty("text", "/EntitySet('foo')/property");

				assert.strictEqual(oControl.getText(), undefined, "synchronous: no value yet");
				oBinding = oControl.getBinding("text");
				oBinding.attachChange(function () {
					assert.strictEqual(oControl.getText(), "value", "initialized");
					fnResolve(oBinding);
				});
			});
		}
	});

	//*********************************************************************************************
	[false, true].forEach(function (bForceUpdate) {
		QUnit.test("checkUpdate(" + bForceUpdate + "): unchanged", function (assert) {
			var that = this;

			return this.createTextBinding(assert).then(function (oBinding) {
				var bGotChangeEvent = false;

				that.oModelMock.expects("read")
					.withExactArgs("/EntitySet('foo')/property")
					.returns(Promise.resolve({value: "value"}));
				oBinding.attachChange(function () {
					bGotChangeEvent = true;
				});

				// code under test
				oBinding.checkUpdate(bForceUpdate).then(function () {
					assert.strictEqual(bGotChangeEvent, bForceUpdate,
						"got change event as expected");
				});
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("checkUpdate(): read error", function (assert) {
		var that = this;

		return this.createTextBinding(assert).then(function (oBinding) {
			var sValue = oBinding.getValue();

			that.oModelMock.expects("read")
				.withExactArgs("/EntitySet('foo')/property")
				.returns(Promise.reject());
			oBinding.attachChange(function () {
				assert.ok(false, "unexpected change event");
			});

			// code under test
			oBinding.checkUpdate(false).then(function () {
				assert.strictEqual(oBinding.getValue(), sValue,
					"read error treated as unchanged value");
			}, function () {
				assert.ok(false, "unexpected failure");
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("ManagedObject.bindProperty w/ relative path, then bindObject", function (assert) {
		var done = assert.async(),
			oModel = new ODataModel("/service"),
			oModelMock = this.oSandbox.mock(oModel),
			oControl = new TestControl({models: oModel});

		oModelMock.expects("read").never();
		oControl.bindProperty("text", "property");
		oControl.getBinding("text").attachChange(function () {
			assert.strictEqual(oControl.getText(), "value");
			done();
		});

		oModelMock.expects("read").withExactArgs("/EntitySet('foo')/property")
			.returns(Promise.resolve({value: "value"}));

		// This creates and initializes a context binding at the control. The change handler of the
		// context binding calls setContext at the property's binding which completes the path and
		// triggers a checkUpdate (resulting in the read). This then fires a change event at the
		// property binding.
		oControl.bindObject("/EntitySet('foo')");
	});

	//*********************************************************************************************
	QUnit.test("setContext on resolved binding", function (assert) {
		var oModel = new ODataModel("/service"),
			oModelMock = this.oSandbox.mock(oModel),
			oBinding = oModel.bindProperty("/EntitySet('foo')/property");

		oModelMock.expects("read").never(); // no read expected due to absolute path

		oBinding.setContext(oModel.getContext("/EntitySet('bar')"));

		assert.strictEqual(oBinding.getContext().getPath(), "/EntitySet('bar')",
			"stored nevertheless");
	});

	// TODO bSuspended? In v2 it is ignored (check with core)
	// TODO read in initialize and refresh? This forces checkUpdate to use getProperty.
});
