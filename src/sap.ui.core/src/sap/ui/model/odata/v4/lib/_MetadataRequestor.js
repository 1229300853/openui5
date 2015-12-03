/*!
 * ${copyright}
 */

//Provides class sap.ui.model.odata.v4.lib._MetadataRequestor
sap.ui.define([
	"jquery.sap.global",
	"./_Helper",
	"./_MetadataConverter"
], function (jQuery, Helper, MetadataConverter) {
	"use strict";

	return {
		/**
		 * Creates a requestor for meta data documents.
		 * @param {object} mHeaders
		 *   a map of headers
		 * @param {object} mQueryParams
		 *   a map of query parameters as described in {@link _Header.buildQuery}
		 * @returns {object}
		 *   a new MetadataRequestor object
		 */
		create : function (mHeaders, mQueryParams) {
			var sQueryStr = Helper.buildQuery(mQueryParams);

			return {
				/**
				 * Reads a metadata document from the given URL.
				 * @param {string} sUrl
				 *   the URL of a metadata document, it must not contain a query string or a
				 *   fragment part
				 * @returns {Promise}
				 *   a promise fulfilled with the metadata as a JSON object
				 */
				read: function (sUrl) {
					return new Promise(function (fnResolve, fnReject) {
						jQuery.ajax(sUrl + sQueryStr, {
							method : "GET",
							headers : mHeaders
						})
						.then(function (oData /*, sTextStatus, jqXHR */) {
							fnResolve(oData);
						}, function (jqXHR, sTextStatus, sErrorMessage) {
							fnReject(Helper.createError(jqXHR));
						});
					}).then(function (oXMLMetadata) {
						return MetadataConverter.convertXMLMetadata(oXMLMetadata);
					});
				}
			};
		}
	};
}, /* bExport= */false);
