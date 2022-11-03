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

rhit.formatDate = function(d) {
	const month = d.getMonth() + 1;
	return `${month}/${d.getDate()}/${d.getFullYear()}`
}

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

rhit.Tag = class {
	constructor(id, name){
		this.id = id;
		this.name = name;
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

rhit.EntryListController = class {
	constructor() {
		rhit.fbEntriesManager.beginListening(this.updateList.bind(this));
	}

	updateList() {
		const newList = htmlToElement('<div id="listDiv"></div>');

		for (let i = 0; i < rhit.fbEntriesManager.length; i++)
		{
			const en = rhit.fbEntriesManager.getEntryAtIndex(i);
			const newRow = this._createRow(en);
			newList.appendChild(newRow);

			newRow.querySelector(".title-text").onclick = (event) => {
				//rhit.storage.setMovieQuoteId(mq.id);

				window.location.href = `/notebook-entry.html?id=${en.id}`;
			};
		}

		const oldList = document.querySelector("#listDiv");
		oldList.removeAttribute("id");
		oldList.hidden = true;

		oldList.parentElement.appendChild(newList);
	}

	_createRow(en) {

		
		return htmlToElement(
			`<div class="option-container">
			<div class="title-text option-text text-align">
				${en[rhit.FB_KEY_TITLE]}
			</div>
			<div class="option-text">
				${rhit.formatDate(en[rhit.FB_KEY_DATE].toDate())}
			</div>
			<div class="option-text">
				${en[rhit.FB_KEY_TAGS]}
			</div>
		</div>`
		);
	}
}

function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim(); // Never return a text node of whitespace as the result
	template.innerHTML = html;
	return template.content.firstChild;
}

rhit.addEntryPageController = class {
	constructor(){
		//for add
		document.querySelector("#submitCreateTag").addEventListener("click", (event) => {
			const name = document.querySelector("#inputTag").value;
			rhit.fbTagsManager.add(name);
		});

		$("#createTagDialog").on("show.bs.modal", (event) => {
			// Pre animation
			document.querySelector("#inputTag").value = "";
		});
		$("#createTagDialog").on("shown.bs.modal", (event) => {
			// Post animation
			document.querySelector("#inputTag").focus();
		});

		document.querySelector("#submitButton").addEventListener("click", (event) => {
			const title = document.querySelector("#entryName").value;
			const content = document.querySelector("#entryContent").value;
			const date = document.querySelector("#datePicker").value;
			const tags = "Software";
			const filename = document.querySelector("#formFile").value;
			rhit.fbEntriesManager.add(title, content, date, tags, filename);
		});
	}

	updateTags() {
		console.log(`Num tags = ${rhit.fbTagsManager.length}`);
		const newTags = htmlToElement(`<ul class="dropdown-menu" id = "tagContainer">
		</ul>`);
		for (let i = 0; i < rhit.fbTagsManager.length; i++) {
			const tag = rhit.fbTagsManager.getTagAtIndex(i);
			const newMenuItem = this._createDropdownItem(tag);
			newTags.appendChild(newMenuItem);
		}


		// Remove the old quoteListContainer
		const oldTags = document.querySelector("#tagContainer");
		oldTags.removeAttribute("id");
		oldTags.hidden = true;
		// Put in the new quoteListContainer
		oldTags.parentElement.appendChild(newTags);
	}

	_createDropdownItem(tag){
		return htmlToElement(`<div class="form-check">
		<input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
		<label class="form-check-label" for="flexCheckDefault">
			${tag.name} 
		</label>
	</div>`);
	}
}

rhit.FbTagsManager = class {
	constructor() {
		this._documentSnapshots = [];
		this._unsubscribe = null;

		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_TAGS);
	}
	beginListening(changeListener) {
		console.log("Listening for tags");
		this._unsubscribe = this._ref
			.limit(50).onSnapshot((querySnapshot) => {
				this._documentSnapshots = querySnapshot.docs;
				console.log("Updated " + this._documentSnapshots.length + " tags.");

				if (changeListener) {
					changeListener();
				}

			});
	}
	stopListening() {
		this._unsubscribe();
	}

	add(name) {
		this._ref.add({
				[rhit.FB_TAGS_NAME]: name
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
	getTagAtIndex(index) {
		const doc = this._documentSnapshots[index];
		return new rhit.Tag(doc.id, doc.get(rhit.FB_TAGS_NAME));
	}
}

rhit.FbSingleTagManager = class {
	constructor(tagID) {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_TAGS).doc(tagID);
	}

	beginListening(changeListener) {
		console.log("Listen for changes to this tag");
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			console.log("Tag updated ", doc);
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
	get name() {
		return this._document.get(rhit.FB_TAGS_NAME);
	}

	delete() {
		return this._ref.delete();
	}
}

rhit.editEntryPageController = class {
	constructor(entryID){
		//for edit
		document.querySelector("#submitCreateTag").addEventListener("click", (event) => {
			const name = document.querySelector("#inputTag").value;
			rhit.fbTagsManager.add(name);
		});

		$("#createTagDialog").on("show.bs.modal", (event) => {
			// Pre animation
			document.querySelector("#inputTag").value = "";
		});
		$("#createTagDialog").on("shown.bs.modal", (event) => {
			// Post animation
			document.querySelector("#inputTag").focus();
		});



		document.querySelector("#submitButton").addEventListener("click", (event) => {
			const title = document.querySelector("#entryName").value;
			const content = document.querySelector("#entryContent").value;
			const date = document.querySelector("#datePicker").value;
			const tags = "Software";
			const filename = document.querySelector("#formFile").value;
			rhit.fbEntriesManager.update(title, content, date, tags, filename);
		});
	}

	updateTags() {
		console.log(`Num tags = ${rhit.fbTagsManager.length}`);
		const newTags = htmlToElement(`<ul class="dropdown-menu" id = "tagContainer">
		</ul>`);
		for (let i = 0; i < rhit.fbTagsManager.length; i++) {
			const tag = rhit.fbTagsManager.getTagAtIndex(i);
			const newMenuItem = this._createDropdownItem(tag);
			newTags.appendChild(newMenuItem);
		}


		// Remove the old quoteListContainer
		const oldTags = document.querySelector("#tagContainer");
		oldTags.removeAttribute("id");
		oldTags.hidden = true;
		// Put in the new quoteListContainer
		oldTags.parentElement.appendChild(newTags);
	}

	_createDropdownItem(tag){
		return htmlToElement(`<div class="form-check">
		<input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
		<label class="form-check-label" for="flexCheckDefault">
			${tag.name} 
		</label>
	</div>`);
	}
}

/* Main */
/** function and class syntax examples */
rhit.main = function () {
	console.log("Ready");

	if (document.querySelector("#viewEntryPage"))
	{
		console.log("On view entry page");
		new rhit.NotebookEntryView();
	}
	if (document.querySelector("#entryListPage"))
	{
		console.log("On entry list page")
		rhit.fbEntriesManager = new rhit.FbEntriesManager();
		new rhit.EntryListController();
	}
};

rhit.main();
