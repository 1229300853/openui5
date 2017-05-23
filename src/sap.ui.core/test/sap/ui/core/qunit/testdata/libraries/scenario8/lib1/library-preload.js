sap.ui.predefine('testlibs/scenario8/lib1/library',['sap/ui/core/Core', 'sap/ui/core/library'], function(Core, coreLib) {
	sap.ui.getCore().initLibrary({
		name: 'testlibs.scenario8.lib1',
		dependencies: [
		],
		noLibraryCSS: true
	});
	return testlibs.scenario8.lib1;
});
jQuery.sap.registerPreloadedModules({
	"version":"2.0",
	"name":"testlibs.scenario8.lib1",
	"modules":{
		"testlibs/scenario8/lib1/manifest.json":"{\n\t\"sap.ui5\": {\n\t\t\"dependencies\": {\n\t\t\t\"libs\": {}\n\t\t}\n\t}\n}"
	}
});