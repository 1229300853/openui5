/*!
 * ${copyright}
 */

//Provides class sap.ui.model.odata.v4.lib.Cache
sap.ui.define(["./_Helper"], function (Helper) {
	"use strict";

	var Cache;

	/**
	 * Converts the known OData system query options from map or array notation to a string. All
	 * other parameters are simply passed through.
	 *
	 * @param {object} mQueryOptions The query options
	 * @param {function(string,any)} fnResultHandler
	 *   The function to process the converted options getting the name and the value
	 */
	function convertSystemQueryOptions(mQueryOptions, fnResultHandler) {
		Object.keys(mQueryOptions).forEach(function (sKey) {
			var vValue = mQueryOptions[sKey];

			switch (sKey) {
				case "$select":
					if (Array.isArray(vValue)) {
						vValue = vValue.join(",");
					}
					break;
				case "$expand":
					vValue = Cache.convertExpand(vValue);
					break;
				default:
					if (sKey[0] === '$') {
						throw new Error("Unsupported system query option " + sKey);
					}
			}
			fnResultHandler(sKey, vValue);
		});
	}

	/**
	 * Fills the given array range with the given value. If iEnd is greater than the array length,
	 * elements are appended to the end, in contrast to Array.fill.
	 *
	 * @param {any[]} aArray
	 *   The array
	 * @param {any} vValue
	 *   The value
	 * @param {int} iStart
	 *   The start index
	 * @param {int} iEnd
	 *   The end index (will not be filled)
	 */
	function fill(aArray, vValue, iStart, iEnd) {
		var i;

		for (i = iStart; i < iEnd; i++) {
			aArray[i] = vValue;
		}
	}

	/**
	 * Requests the elements in the given range and places them into the aElements list. While the
	 * request is running, all indexes in this range contain the Promise.
	 * A refresh cancels processing of all pending requests by throwing an error that has a
	 * property <code>canceled</code> which is set to <code>true</code>.
	 *
	 * @param {sap.ui.model.odata.v4.lib._CollectionCache} oCache
	 *   The cache
	 * @param {int} iStart
	 *   The index of the first element to request ($skip)
	 * @param {int} iEnd
	 *   The position of the last element to request ($skip + $top)
	 */
	function requestElements(oCache, iStart, iEnd) {
		var aElements = oCache.aElements,
			iExpectedLength = iEnd - iStart,
			oPromise,
			sUrl = oCache.sUrl + "$skip=" + iStart + "&$top=" + iExpectedLength;

		oPromise = oCache.oRequestor.request("GET", sUrl)
			.then(function (oResult) {
				var i, iResultLength = oResult.value.length, oError;

				if (aElements !== oCache.aElements) {
					oError = new Error("Refresh canceled processing of pending request: " + sUrl);
					oError.canceled = true;
					throw oError;
				}
				oCache.sContext = oResult["@odata.context"];
				if (iResultLength < iExpectedLength) {
					oCache.iMaxElements = iStart + iResultLength;
					oCache.aElements.splice(oCache.iMaxElements, iExpectedLength - iResultLength);
				}
				for (i = 0; i < iResultLength; i++) {
					oCache.aElements[iStart + i] = oResult.value[i];
				}
			})["catch"](function (oError) {
				if (aElements === oCache.aElements) {
					fill(oCache.aElements, undefined, iStart, iEnd);
				}
				throw oError;
			});

		fill(oCache.aElements, oPromise, iStart, iEnd);
	}

	/**
	 * Creates a cache for a collection of entities that performs requests using the given
	 * requestor.
	 *
	 * @param {sap.ui.model.odata.v4.lib._Requestor} oRequestor
	 *   The requestor
	 * @param {string} sUrl
	 *   The URL to request from
	 * @param {object} [mQueryOptions]
	 *   A map of key-value pairs representing the query string
	 */
	function CollectionCache(oRequestor, sUrl, mQueryOptions) {
		var sQuery = Cache.buildQueryString(mQueryOptions);

		sQuery += sQuery.length ? "&" : "?";
		this.oRequestor = oRequestor;
		this.sUrl = sUrl + sQuery;
		this.sContext = undefined;  // the "@odata.context" from the responses
		this.iMaxElements = -1;     // the max. number of elements if known, -1 otherwise
		this.aElements = [];        // the available elements
	}

	/**
	 * Returns a promise resolved with an OData object for a range of the requested data.
	 *
	 * @param {int} iIndex
	 *   The start index of the range; the first row has index 0
	 * @param {int} iLength
	 *   The length of the range
	 * @returns {Promise}
	 *   A Promise to be resolved with the requested range given as an OData response object (with
	 *   "@odata.context" and the rows as an array in the property <code>value</code>). If an HTTP
	 *   request fails, the error from the _Requestor is returned and the requested range is reset
	 *   to undefined.
	 *   A refresh cancels processing of all pending promises by throwing an error that has a
	 *   property <code>canceled</code> which is set to <code>true</code>.
	 * @see sap.ui.model.odata.v4.lib._Requestor#request
	 */
	CollectionCache.prototype.read = function (iIndex, iLength) {
		var i,
			iEnd = iIndex + iLength,
			iGapStart = -1,
			that = this;

		if (iIndex < 0) {
			throw new Error("Illegal index " + iIndex + ", must be >= 0");
		}
		if (iLength < 0) {
			throw new Error("Illegal length " + iLength + ", must be >= 0");
		}

		if (this.iMaxElements >= 0 && iEnd > this.iMaxElements) {
			iEnd = this.iMaxElements;
		}

		for (i = iIndex; i < iEnd; i++) {
			if (this.aElements[i] !== undefined) {
				if (iGapStart >= 0) {
					requestElements(this, iGapStart, i);
					iGapStart = -1;
				}
			} else if (iGapStart < 0) {
				iGapStart = i;
			}
		}
		if (iGapStart >= 0) {
			requestElements(this, iGapStart, iEnd);
		}

		return Promise.all(this.aElements.slice(iIndex, iEnd)).then(function () {
			return {
				"@odata.context" : that.sContext,
				value: that.aElements.slice(iIndex, iEnd)
			};
		});
	};

	/**
	 * Clears cache and cancels processing of all pending read requests.
	 */
	CollectionCache.prototype.refresh = function () {
		this.sContext = undefined;
		this.iMaxElements = -1;
		this.aElements = [];
	};

	/**
	 * Returns the cache's URL.
	 *
	 * @returns {string} The URL
	 */
	CollectionCache.prototype.toString = function () {
		return this.sUrl;
	};

	/**
	 * Creates a cache for a single entity that performs requests using the given requestor.
	 *
	 * @param {sap.ui.model.odata.v4.lib._Requestor} oRequestor
	 *   The requestor
	 * @param {string} sUrl
	 *   The URL to request from
	 * @param {object} [mQueryOptions]
	 *   A map of key-value pairs representing the query string
	 */
	function SingleCache(oRequestor, sUrl, mQueryOptions) {
		this.oRequestor = oRequestor;
		this.sUrl = sUrl + Cache.buildQueryString(mQueryOptions);
		this.oPromise = null;
	}

	/**
	 * Returns a promise resolved with an OData object for the requested data.
	 *
	 * @returns {Promise}
	 *   A Promise to be resolved with the element.
	 *   A refresh cancels processing a pending promise by throwing an error that has a
	 *   property <code>canceled</code> which is set to <code>true</code>.
	 */
	SingleCache.prototype.read = function () {
		var that = this,
			oError,
			oPromise,
			sUrl = this.sUrl;

		if (!this.oPromise) {
			oPromise = this.oRequestor.request("GET", sUrl).then(function (oResult) {
				if (that.oPromise !== oPromise) {
					oError = new Error("Refresh canceled processing of pending request: " + sUrl);
					oError.canceled = true;
					throw oError;
				}
				return oResult;
			});
			this.oPromise = oPromise;
		}
		return this.oPromise;
	};

	/**
	 * Clears cache and cancels processing of a pending read request.
	 */
	SingleCache.prototype.refresh = function () {
		this.oPromise = undefined;
	};

	/**
	 * Returns the single cache's URL.
	 *
	 * @returns {string} The URL
	 */
	SingleCache.prototype.toString = function () {
		return this.sUrl;
	};

	Cache = {
		/**
		 * Builds a query string from the parameter map. Converts $select (which may be an array)
		 * and $expand (which must be an object) accordingly. All other system query options are
		 * rejected.
		 *
		 * @param {object} mQueryOptions
		 *   A map of key-value pairs representing the query string
		 * @returns {string}
		 *   The query string; it is empty if there are no options; it starts with "?" otherwise
		 * @example
		 * {
		 *		$expand: {
		 *			"SO_2_BP": true,
		 *			"SO_2_SOITEM": {
		 *				"$expand": {
		 *					"SOITEM_2_PRODUCT": {
		 *						"$expand" : {
		 *							"PRODUCT_2_BP" : true,
		 *						},
		 *						"$select": "CurrencyCode"
		 *					},
		 *					"SOITEM_2_SO": true
		 *				}
		 *			}
		 *		},
		 *		"sap-client" : "003"
		 *	}
		 */
		buildQueryString: function (mQueryOptions) {
			return Helper.buildQuery(Cache.convertQueryOptions(mQueryOptions));
		},

		/**
		 *  Converts the value for a "$expand" in mQueryParams.
		 *
		 *  @param {object} mExpandItems The expand items, a map from path to options
		 *  @returns {string} The resulting value for the query string
		 *  @throws {Error} If the expand items are not an object
		 */
		convertExpand : function (mExpandItems) {
			var aResult = [];

			if (!mExpandItems || typeof mExpandItems  !== "object") {
				throw new Error("$expand must be a valid object");
			}

			Object.keys(mExpandItems).forEach(function (sExpandPath) {
				var vExpandOptions = mExpandItems[sExpandPath];

				if (vExpandOptions && typeof vExpandOptions === "object") {
					aResult.push(Cache.convertExpandOptions(sExpandPath, vExpandOptions));
				} else {
					aResult.push(sExpandPath);
				}
			});

			return aResult.join(",");
		},

		/**
		 * Converts the expand options.
		 *
		 * @param {string} sExpandPath The expand path
		 * @param {boolean|object} vExpandOptions
		 *   The options; either a map or simply <code>true</code>
		 * @returns {string} The resulting string for the OData query in the form "path" (if no
		 *   options) or "path($option1=foo;$option2=bar)"
		 */
		convertExpandOptions : function (sExpandPath, vExpandOptions) {
			var aExpandOptions = [];

			convertSystemQueryOptions(vExpandOptions, function (sOptionName, vOptionValue) {
				aExpandOptions.push(sOptionName + '=' + vOptionValue);
			});
			return aExpandOptions.length ? sExpandPath + "(" + aExpandOptions.join(";") + ")"
				: sExpandPath;
		},

		/**
		 * Converts the query options. All system query options are converted to strings, so that
		 * the result can be used for Helper.buildQuery.
		 *
		 * @param {object} mQueryOptions The query options
		 * @returns {object} The converted query options
		 */
		convertQueryOptions : function (mQueryOptions) {
			var mConvertedQueryOptions = {};

			if (!mQueryOptions) {
				return undefined;
			}
			convertSystemQueryOptions(mQueryOptions, function (sKey, vValue) {
				mConvertedQueryOptions[sKey] = vValue;
			});
			return mConvertedQueryOptions;
		},

		/**
		 * Creates a cache for a collection of entities that performs requests using the given
		 * requestor.
		 *
		 * @param {sap.ui.model.odata.v4.lib._Requestor} oRequestor
		 *   The requestor
		 * @param {string} sUrl
		 *   The URL to request from; it must contain the path to the OData service, it must not
		 *   contain a query string<br>
		 *   Example: /V4/Northwind/Northwind.svc/Products
		 * @param {object} mQueryOptions
		 *   A map of key-value pairs representing the query string, the value in this pair has to
		 *   be a string or an array of strings; if it is an array, the resulting query string
		 *   repeats the key for each array value.
		 *   Examples:
		 *   {foo: "bar", "bar": "baz"} results in the query string "foo=bar&bar=baz"
		 *   {foo: ["bar", "baz"]} results in the query string "foo=bar&foo=baz"
		 * @returns {sap.ui.model.odata.v4.lib._Cache}
		 *   The cache
		 */
		create: function _create(oRequestor, sUrl, mQueryOptions) {
			return new CollectionCache(oRequestor, sUrl, mQueryOptions);
		},

		/**
		 * Creates a cache for a single entity that performs requests using the given requestor.
		 *
		 * @param {sap.ui.model.odata.v4.lib._Requestor} oRequestor
		 *   The requestor
		 * @param {string} sUrl
		 *   The URL to request from; it must contain the path to the OData service, it must not
		 *   contain a query string<br>
		 *   Example: /V4/Northwind/Northwind.svc/Products(ProductID=1)
		 * @param {object} mQueryOptions
		 *   A map of key-value pairs representing the query string, the value in this pair has to
		 *   be a string or an array of strings; if it is an array, the resulting query string
		 *   repeats the key for each array value.
		 *   Examples:
		 *   {foo: "bar", "bar": "baz"} results in the query string "foo=bar&bar=baz"
		 *   {foo: ["bar", "baz"]} results in the query string "foo=bar&foo=baz"
		 * @returns {sap.ui.model.odata.v4.lib._Cache}
		 *   The cache
		 */
		createSingle: function _createSingle(oRequestor, sUrl, mQueryOptions) {
			return new SingleCache(oRequestor, sUrl, mQueryOptions);
		}
	};

	return Cache;
}, /* bExport= */false);
