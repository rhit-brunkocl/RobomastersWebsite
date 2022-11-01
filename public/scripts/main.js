var rhit = rhit || {};

rhit.FB_COLLECTION_ENTRIES = "Entries";
rhit.FB_KEY_TITLE = "title";
rhit.FB_KEY_CONTENT = "content";
rhit.FB_KEY_DATE = "date";
rhit.FB_KEY_TAGS = "tags";
rhit.FB_KEY_FILENAME = "filename";
rhit.FB_COLLECTION_TAGS = "Tags";
rhit.FB_TAGS_NAME = "name";
rhit.fbEntriesManager = null;
rhit.fbSingleEntryManager = null;
rhit.fbAuthManager = null;

rhit.Entry = class {
	constructor(id, title, content, date, tags, filename) {
		this.id = id;
		this.title = title;
		this.content = content;
		this.date = date;
		this.tags = tags;
		this.filename = filename;
	}
}

rhit.FbEntriesManager = class {
	constructor() {
		this._documentSnapshots = [];
		this._unsubscribe = null;

		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_ENTRIES);
	}
	beginListening(changeListener) {
		console.log("Listening for entries");
		this._unsubscribe = this._ref.orderBy(rhit.FB_KEY_DATE, "desc")
			.limit(50).onSnapshot((querySnapshot) => {
				this._documentSnapshots = querySnapshot.docs;
				console.log("Updated " + this._documentSnapshots.length + " entries.");

				if (changeListener) {
					changeListener();
				}

			});
	}
	stopListening() {
		this._unsubscribe();
	}

	add(title, content, date, tags, filename) {
		this._ref.add({
				[rhit.FB_KEY_TITLE]: title,
				[rhit.FB_KEY_CONTENT]: content,
				[rhit.FB_KEY_DATE]: date,
				[rhit.FB_KEY_TAGS]: tags,
				[rhit.FB_KEY_FILENAME]: filename,
			})
			.then(function (docRef) {
				console.log("Document added with ID: ", docRef.id);
			})
			.catch(function (error) {
				console.error("Error adding document: ", error);
			});
	}

	get length() {
		return this._documentSnapshots.length;
	}
	getEntryAtIndex(index) {
		const doc = this._documentSnapshots[index];
		return new rhit.Entry(doc.id, doc.get(rhit.FB_KEY_TITLE), doc.get(rhit.FB_KEY_CONTENT), doc.get(rhit.FB_KEY_DATE), doc.get(rhit.FB_KEY_TAGS), doc.get(rhit.FB_KEY_FILENAME));
	}
}

rhit.FbSingleQuoteManager = class {
	constructor(entryID) {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_ENTRIES).doc(entryID);
	}

	beginListening(changeListener) {
		console.log("Listen for changes to this quote");
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			console.log("Entry updated ", doc);
			if (doc.exists) {
				this._document = doc;
				changeListener();
			} else {
				console.log("Document does not exist any longer.");
				console.log("CONSIDER: automatically navigate back to the home page.");
			}
		});
	}

	stopListening() {
		this._unsubscribe();
	}
	get title() {
		return this._document.get(rhit.FB_KEY_TITLE);
	}

	get content() {
		return this._document.get(rhit.FB_KEY_CONTENT);
	}

	get date(){
		return this._document.get(rhit.FB_KEY_DATE);
	}

	get tags(){
		return this._document.get(rhit.FB_KEY_TAGS);
	}

	get filename(){
		return this._document.get(rhit.FB_KEY_FILENAME);
	}

	update(title, content, date, tags, filename) {
		this._ref.update({
			[rhit.FB_KEY_TITLE]: title,
			[rhit.FB_KEY_CONTENT]: content,
			[rhit.FB_KEY_DATE]: date,
			[rhit.FB_KEY_TAGS]: tags,
			[rhit.FB_KEY_FILENAME]: filename,
		}).then(() => {
			console.log("Document has been updated");
		});
	}
	delete() {
		return this._ref.delete();
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

rhit.addEntryPageController = class {
	constructor(){
		//for add
		document.querySelector("#submitButton").addEventListener("click", (event) => {
			const title = document.querySelector("#entryName").value;
			const content = document.querySelector("#entryContent").value;
			const date = document.querySelector("#datePicker").value;
			const tags = "Software";
			const filename = document.querySelector("#formFile").value;
			rhit.fbEntriesManager.add(title, content, date, tags, filename);
		});
	}

	constructor(entryID){
		//for edit

		document.querySelector("#submitButton").addEventListener("click", (event) => {
			const title = document.querySelector("#entryName").value;
			const content = document.querySelector("#entryContent").value;
			const date = document.querySelector("#datePicker").value;
			const tags = "Software";
			const filename = document.querySelector("#formFile").value;
			rhit.fbEntriesManager.add(title, content, date, tags, filename);
		});
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
