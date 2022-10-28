/**
 * @fileoverview
 * Provides the JavaScript interactions for all pages.
 *
 * @author 
 * PUT_YOUR_NAME_HERE
 */

/** namespace. */
var rhit = rhit || {};

/** globals */
rhit.variableName = "";

/** function and class syntax examples */
rhit.functionName = function () {
	/** function body */
};

rhit.ClassName = class {
	constructor() {

	}

	methodName() {

	}
}

rhit.NotebookEntryView = class {
	constructor() {
		document.querySelector("#backButton").onclick = (event) => {
			console.log("going back to list");
			window.location.href = "entry-list.html";
		}
	}

	methodName() {

	}
}

/* Main */
/** function and class syntax examples */
rhit.main = function () {
	console.log("Ready");

	if (document.querySelector("#viewEntryPage"))
	{
		console.log("On view entry page");
		const notebookEntryView = new rhit.NotebookEntryView();
	}
};

rhit.main();
