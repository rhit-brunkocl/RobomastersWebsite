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
rhit.fbTagsManager = null;
rhit.FbSingleTagManager = null;
rhit.fbAuthManager = null;
rhit.tagsForEntry = [];

rhit.formatDate = function(d) {
	const month = d.getMonth() + 1;
	return `${month}/${d.getDate()}/${d.getFullYear()}`
}

// From: https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
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

rhit.FbSingleEntryManager = class {
	constructor(entryID) {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_ENTRIES).doc(entryID);
	}

	beginListening(changeListener) {
		console.log("Listen for changes to this entry");
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

	addTag(tag){
		tags = this.tags();
		tags.add(tag);
		this._ref.update({
			[rhit.FB_KEY_TAGS]:tags
		}).then(() => {
			console.log("tag has been added");
		});
	}
	removeTag(tag){
		tags = this.tags();
		tags = tags.filter(function(value){
			return value.name == tag.name;
		});
		this._ref.update({
			[rhit.FB_KEY_TAGS]:tags
		}).then(() => {
			console.log("tag has been removed");
		});
	}

	delete() {
		return this._ref.delete();
	}
}



rhit.NotebookEntryController = class {
	constructor() {
		rhit.fbSingleEntryManager.beginListening(this.updateView.bind(this));

		document.querySelector("#backButton").onclick = (event) => {
			console.log("going back to list");
			window.location.href = "entry-list.html";
		}
	}

	updateView() {
		document.querySelector("#detailEntryTitle").innerText = rhit.fbSingleEntryManager.title;
		document.querySelector("#detailEntryDate").innerText = rhit.fbSingleEntryManager.date;
		document.querySelector("#detailEntryTags").innerText = `Tags: ${rhit.fbSingleEntryManager.tags}`;
		document.querySelector("#detailEntryContent").innerText = rhit.fbSingleEntryManager.content;
	}
}

rhit.EntryListController = class {
	constructor() {
		rhit.fbEntriesManager.beginListening(this.updateList.bind(this));
		
		this.selectedRowEntry = null;

		document.querySelector("#addEntry").onclick = (event) => {
			window.location.href = "/edit-add-entry.html";
		};

		document.querySelector("#editEntry").onclick = (event) => {
			if (this.selectedRowEntry) {
				window.location.href = `/edit-add-entry.html?id=${this.selectedRowEntry.id}`;
			}
		};

		document.querySelector("#deleteEntry").onclick = (event) => {
			if (this.selectedRowEntry) {
				rhit.fbSingleEntryManager = new rhit.FbSingleEntryManager(this.selectedRowEntry.id);
				rhit.fbSingleEntryManager.delete();
			}
		};

	}

	updateList() {
		const newList = htmlToElement('<div id="listDiv"></div>');

		for (let i = 0; i < rhit.fbEntriesManager.length; i++)
		{
			const en = rhit.fbEntriesManager.getEntryAtIndex(i);
			const newRow = this._createRow(en);

			newList.appendChild(newRow);
			newRow.querySelector(".title-text").onclick = (event) => {
				window.location.href = `/notebook-entry.html?id=${en.id}`;
			};

			newRow.onclick = (event) => {
				console.log("clicked on row");
				this.selectedRowEntry = en;

				const rows = document.querySelectorAll(".option-container");
				for (let i = 0; i < rows.length; i++)
				{
					rows[i].style = "background-color:#ffffff";
				}

				newRow.style = "background-color:#aaaaaa;";
			}
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
				${en[rhit.FB_KEY_DATE]}
			</div>
			<div class="option-text">
				${en[rhit.FB_KEY_TAGS]}
			</div>
		</div>`
		);
	}
}

rhit.addEntryPageController = class {
	constructor(){
		//for add
		var selectedFile;
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

		const fileInput = document.getElementById('formFile');
		fileInput.onchange = () => {
  			selectedFile = fileInput.files[0];
  			console.log(selectedFile);
		}

		rhit.tagsForEntry = [];

		this.updateTags();

		rhit.fbTagsManager = new rhit.FbTagsManager();
		rhit.fbTagsManager.beginListening(this.loadTags.bind(this));
		this.loadTags();

		document.querySelector("#submitButton").addEventListener("click", (event) => {
			const title = document.querySelector("#entryName").value;
			const content = document.querySelector("#entryContent").value;
			const date = document.querySelector("#datePicker").value;
			var tags = [];
			for(var i = 0; i < rhit.tagsForEntry.length; i++){
				tags.push(rhit.tagsForEntry[i].name);
			}
			var filename;
			if(selectedFile == null){
				filename = "";
				rhit.fbEntriesManager.add(title, content, date, tags, filename);
				window.location.href = "entry-list.html";
			}else{
				var storageRef = firebase.storage().ref();
				var fileRef = storageRef.child(selectedFile.name);
				const metadata = {
					"content-type": selectedFile.type
				};
				fileRef.put(selectedFile, metadata).then((snapshot) => {
					console.log('Uploaded a blob or file!');
					fileRef.getDownloadURL().then((downloadURL) => {
						console.log("File available at", downloadURL);
						filename = downloadURL;
						rhit.fbEntriesManager.add(title, content, date, tags, filename);
						window.location.href = "entry-list.html";
					});
				});
			}
		});
	}

	loadTags() {
		console.log(`Num tags = ${rhit.fbTagsManager.length}`);

		$('#tagContainer').empty();

		for (let i = 0; i < rhit.fbTagsManager.length; i++) {
			const tag = rhit.fbTagsManager.getTagAtIndex(i);
			this.addTag(tag);
		}
	}

	_createDropdownItem(tag){
		return `<div class="form-check">
		<input class="form-check-input" type="checkbox" value="" id="${tag.name}">
		<label class="form-check-label" for="${tag.name}">
			${tag.name} 
		</label>
	</div>`;
	}


	addTag(tag){
		const newMenuItem = this._createDropdownItem(tag);
		$('#tagContainer').append(newMenuItem);
		$(`#${tag.name}`).on("click", (event) => {
			if($(`#${tag.name}`).is(':checked')){
				rhit.tagsForEntry.push(tag);
				this.updateTags();
				console.log(`${tag.name} checked`);
				console.log(rhit.tagsForEntry);
			}else{
				rhit.tagsForEntry = rhit.tagsForEntry.filter(function(value){
					return value.name != tag.name;
				});
				this.updateTags();
				console.log(`${tag.name} unchecked`);
				console.log(rhit.tagsForEntry);
			}
		});
	}

	
	updateTags(){
		var tagString = "";
		if(rhit.tagsForEntry.length != 0){
			for(var i = 0; i < rhit.tagsForEntry.length -1; i++){
				tagString += rhit.tagsForEntry[i].name + ", ";
			}
			tagString += rhit.tagsForEntry[rhit.tagsForEntry.length - 1].name;
		}
		document.querySelector("#tagLabel").innerHTML = tagString;
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

		const fileInput = document.getElementById('formFile');
		fileInput.onchange = () => {
  			const selectedFile = fileInput.files[0];
  			console.log(selectedFile);
		}

		rhit.tagsForEntry = rhit.fbSingleEntryManager.tags();

		document.querySelector("#submitButton").addEventListener("click", (event) => {
			const title = document.querySelector("#entryName").value;
			const content = document.querySelector("#entryContent").value;
			const date = document.querySelector("#datePicker").value;
			const tags = rhit.tagsForEntry;
			const filename = document.querySelector("#formFile").value;
			rhit.fbEntriesManager.update(title, content, date, tags, filename);
		});
	}

	updateTags(){
		var tagString = "";
		for(var i = 0; i < rhit.tagsForEntry.length -1; i++){
			tagString += rhit.tagsForEntry[i].name + ", ";
		}
		tagString += rhit.tagsForEntry[rhit.tagsForEntry.length - 1].name;
		document.querySelector("#tagLabel").innerHTML = tagString;
	}

	loadTags() {
		console.log(`Num tags = ${rhit.fbTagsManager.length}`);

		$('#tagContainer').empty();

		for (let i = 0; i < rhit.fbTagsManager.length; i++) {
			const tag = rhit.fbTagsManager.getTagAtIndex(i);
			this.addTag(tag);
		}
	}

	_createDropdownItem(tag){
		return `<div class="form-check">
		<input class="form-check-input" type="checkbox" value="" id="${tag.name}">
		<label class="form-check-label" for="${tag.name}">
			${tag.name} 
		</label>
	</div>`;
	}


	addTag(tag){
		const newMenuItem = this._createDropdownItem(tag);
		$('#tagContainer').append(newMenuItem);
		$(`#${tag.name}`).on("click", (event) => {
			if($(`#${tag.name}`).is(':checked')){
				rhit.tagsForEntry.push(tag);
				this.updateTags();
				console.log(`${tag.name} checked`);
				console.log(rhit.tagsForEntry);
			}else{
				rhit.tagsForEntry = rhit.tagsForEntry.filter(function(value){
					return value.name != tag.name;
				});
				this.updateTags();
				console.log(`${tag.name} unchecked`);
				console.log(rhit.tagsForEntry);
			}
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

		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const entryId = urlParams.get("id");

		console.log(`viewing entry ${entryId}`);

		if (!entryId)
		{
			window.location.href = "/entry-list.html";
		}

		rhit.fbSingleEntryManager = new rhit.FbSingleEntryManager(entryId);
		new rhit.NotebookEntryController();
	}
	if (document.querySelector("#entryListPage"))
	{
		console.log("On entry list page")
		rhit.fbEntriesManager = new rhit.FbEntriesManager();
		new rhit.EntryListController();
	}
	if (document.querySelector("#editAddEntryPage"))
	{
		console.log("On add entry page");
		rhit.fbEntriesManager = new rhit.FbEntriesManager();
		new this.addEntryPageController();
	}
};

rhit.main();
