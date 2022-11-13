var rhit = rhit || {};

rhit.FB_COLLECTION_ENTRIES = "Entries";
rhit.FB_COLLECTION_USERS = "Users";
rhit.FB_KEY_TITLE = "title";
rhit.FB_KEY_CONTENT = "content";
rhit.FB_KEY_DATE = "date";
rhit.FB_KEY_TAGS = "tags";
rhit.FB_KEY_FILENAME = "filename";
rhit.FB_KEY_NAME = "name";
rhit.FB_KEY_USERNAME = "username";
rhit.FB_KEY_ISADMIN = "isAdmin";
rhit.FB_KEY_MAJOR = "major";
rhit.FB_KEY_EMAIL = "email";
rhit.FB_KEY_SUBTEAMS = "subteams";
rhit.FB_KEY_YEAR = "year";
rhit.FB_COLLECTION_TAGS = "Tags";
rhit.FB_TAGS_NAME = "name";
rhit.fbEntriesManager = null;
rhit.fbSingleEntryManager = null;
rhit.fbTagsManager = null;
rhit.FbSingleTagManager = null;
rhit.fbAuthManager = null;
rhit.fbUserManager = null;
rhit.tagsForEntry = [];
rhit.storageRef = firebase.storage().ref();

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

rhit.NavbarController = class {
	constructor() {
		const logoutBtn = document.querySelector("#logoutBtn");
		if (logoutBtn) {
			logoutBtn.onclick = (event) => {
				rhit.fbAuthManager.signOut().then(() => {
					window.location.href = "/";
				})
			}
		}
	}
}

rhit.FbEntriesManager = class {
	constructor() {
		this._documentSnapshots = [];
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_ENTRIES);
	}
	beginListening(sortBy, sortDirection, changeListener) {
		console.log("Listening for entries");
		this._unsubscribe = this._ref.orderBy(sortBy, sortDirection)
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
				window.location.href = "entry-list.html";
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

rhit.FbAuthManager = class {
	constructor() {
		this._user = null;
		this._name = "";
	}

	beginListening(changeListener) {
		return new Promise((resolve, reject) => {
			firebase.auth().onAuthStateChanged((user) => {
				this._user = user;
				console.log(this._user);
				changeListener();
				resolve();
			});
		});
	}

	register(name, email, username, password) {
		firebase.auth().createUserWithEmailAndPassword(email, password)
		.then((userCredential) => {
			console.log("created user");
			var user = userCredential.user;
			console.log(user);
			rhit.fbUserManager.addNewUser(user.uid, name, email, username);
		})
		.catch((error) => {
			var errorCode = error.code;
			var errorMessage = error.message;
			console.log(errorCode, errorMessage);
		});
	}

	signIn(email, password) {
		firebase.auth().signInWithEmailAndPassword(email, password)
		.then((userCredential) => {
			console.log("signed in");
		})
		.catch((error) => {
			var errorCode = error.code;
			var errorMessage = error.message;
			console.log(errorCode, errorMessage);
  });
	}

	signOut() {
		return firebase.auth().signOut().catch((error) => {
			console.log("signout error");
		  });
	}

	getIsSignedIn() {
		return !!this._user;
	}

	get uid() {
		return this._user.uid;
	}

	get name() {
		return this._name || this._user.displayName;
	}
}

rhit.FbUserManager = class {
	constructor() {
		this._collectionRef = firebase.firestore().collection(rhit.FB_COLLECTION_USERS);
		this._document = null;
		this._unsubscribe = null;
	}

	addNewUser(uid, name, email, username) {
		var userRef = this._collectionRef.doc(uid);

		return userRef.get().then((doc) => {
			if (doc.exists) {
				console.log("Already user. Document data: ", doc.data());
				return false;
			}
			else{
				console.log("no such document! Must create user");

				return userRef.set({
					[rhit.FB_KEY_NAME]: name,
					[rhit.FB_KEY_EMAIL]: email,
					[rhit.FB_KEY_USERNAME]: username,
					[rhit.FB_KEY_ISADMIN]: false,
					[rhit.FB_KEY_MAJOR]: "",
					[rhit.FB_KEY_SUBTEAMS]: [],
					[rhit.FB_KEY_YEAR]: 1,
				}).then(() => {
					console.log("user data successfully written!");
					return true;
				}).catch((error) => {
					console.log("error setting user data", error);
				});
			}
		}).catch((error) => {
			console.log("error getting doc", error);
		})
	}

	beginListening(uid, changeListener) {
		const userRef = this._collectionRef.doc(uid);

		this._unsubscribe = userRef.onSnapshot((doc) => {
			if (doc.exists)
			{
				this._document = doc;
				changeListener();
			}
			else
			{
				console.log("No user.");
			}
		});
	}

	stopListening() {
		this._unsubscribe();
	}

	updateInfo(name, username, major, year, subteams) {
		const userRef = this._collectionRef.doc(rhit.fbAuthManager.uid);
		return userRef.update({
			[rhit.FB_KEY_NAME]: name,
			[rhit.FB_KEY_USERNAME]: username,
			[rhit.FB_KEY_MAJOR]: major,
			[rhit.FB_KEY_YEAR]: year,
			[rhit.FB_KEY_SUBTEAMS]: subteams,
		})
		.then(() => {
			console.log("Document successfully updated!");
		})
		.catch(function (error) {
			console.error("Error updating document: ", error);
		});
	}

	get name() {
		return this._document.get(rhit.FB_KEY_NAME);
	}

	get username() {
		return this._document.get(rhit.FB_KEY_USERNAME);
	}

	get email() {
		return this._document.get(rhit.FB_KEY_EMAIL);
	}

	get major() {
		return this._document.get(rhit.FB_KEY_MAJOR);
	}

	get year() {
		return this._document.get(rhit.FB_KEY_YEAR);
	}

	get subteams() {
		return this._document.get(rhit.FB_KEY_SUBTEAMS);
	}

	get isListening() {
		return !!this._unsubscribe;
	}
}

rhit.ProfilePageController = class {
	constructor() {

		rhit.fbUserManager.beginListening(rhit.fbAuthManager.uid, this.initializeInfo.bind(this));

		this.chosenMajor = "None";
		this.chosenYear = "1st";

		const majorBtns = document.querySelectorAll(".majorItem");
		for (let i = 0; i < majorBtns.length; i++)
		{
			majorBtns[i].onclick = (event) => {
				this.chosenMajor = majorBtns[i].innerText;
				document.querySelector("#majorText").innerText = "Chosen Major: " + this.chosenMajor;
			}
		}

		const yearBtns = document.querySelectorAll(".yearItem");
		for (let i = 0; i < yearBtns.length; i++)
		{
			yearBtns[i].onclick = (event) => {
				this.chosenYear = yearBtns[i].innerText;
				document.querySelector("#yearText").innerText = "Chosen Year: " + this.chosenYear;
			}
		}

		document.querySelector("#submitInfo").onclick = (event) => {
			const name = document.querySelector("#changeName").value;
			const username = document.querySelector("#changeUsername").value;
			const major = this.chosenMajor;
			const year = this.chosenYear;
			const subteams = this.subteamArray();
			rhit.fbUserManager.updateInfo(name, username, major, year, subteams).then(() => {
				window.location.href = "/entry-list.html";
			});
		  };
	}

	subteamArray() {
		let arr = [];
		if (document.querySelector("#softwareCheck").checked)
		{
			arr.push("Software");
		}
		if (document.querySelector("#hardwareCheck").checked)
		{
			arr.push("Hardware");
		}
		if (document.querySelector("#mechanicalCheck").checked)
		{
			arr.push("Mechanical");
		}
		if (document.querySelector("#outreachCheck").checked)
		{
			arr.push("Outreach");
		}
		return arr;
	}

	initializeInfo() {
		this.chosenMajor = rhit.fbUserManager.major;
		this.chosenYear = rhit.fbUserManager.year;

		document.querySelector("#changeName").value = rhit.fbUserManager.name;
		document.querySelector("#changeUsername").value = rhit.fbUserManager.username;
		document.querySelector("#majorText").innerText = "Chosen Major: " + this.chosenMajor;
		document.querySelector("#yearText").innerText = "Chosen Year: " + rhit.fbUserManager.year;


		const subteams = rhit.fbUserManager.subteams;
		document.querySelector("#softwareCheck").checked = (subteams.includes("Software"));
		document.querySelector("#hardwareCheck").checked = (subteams.includes("Hardware"));
		document.querySelector("#mechanicalCheck").checked = (subteams.includes("Mechanical"));
		document.querySelector("#outreachCheck").checked = (subteams.includes("Outreach"));
	}
}

rhit.LoginPageController = class {
	constructor() {

		document.querySelector("#loginBtn").onclick = (event) => {
			const loginEmailValue = document.querySelector("#loginEmail").value;
			const loginPasswordValue = document.querySelector("#loginPassword").value;
			rhit.fbAuthManager.signIn(loginEmailValue, loginPasswordValue);
		};

		document.querySelector("#registerBtn").onclick = (event) => {
			const registerNameValue = document.querySelector("#registerName").value;
			const registerEmailValue = document.querySelector("#registerEmail").value;
			const registerUsernameValue = document.querySelector("#registerUsername").value;
			const registerPasswordValue = document.querySelector("#registerPassword").value;
			rhit.fbAuthManager.register(registerNameValue, registerEmailValue, registerUsernameValue, registerPasswordValue);
		}
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
		if(rhit.fbSingleEntryManager.filename != ""){
			document.getElementById("filePreview").src = rhit.fbSingleEntryManager.filename;
		}
	}
}

rhit.EntryListController = class {
	constructor() {
		rhit.fbEntriesManager.beginListening(rhit.FB_KEY_DATE, "desc", this.updateList.bind(this));
		
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

		document.querySelector("#sortByName").onclick = (event) => {
			rhit.fbEntriesManager.stopListening();
			rhit.fbEntriesManager.beginListening(rhit.FB_KEY_TITLE, "asc", this.updateList.bind(this));
		};

		document.querySelector("#sortByDate").onclick = (event) => {
			rhit.fbEntriesManager.stopListening();
			rhit.fbEntriesManager.beginListening(rhit.FB_KEY_DATE, "desc", this.updateList.bind(this));
		};

		document.querySelector("#sortByTags").onclick = (event) => {
			rhit.fbEntriesManager.stopListening();
			rhit.fbEntriesManager.beginListening(rhit.FB_KEY_TAGS, "asc", this.updateList.bind(this));
		};

		document.querySelector("#searchBar").onchange = (event) => {
			//typesense
			console.log("User typed in search bar");
		}

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
				var fileRef = rhit.storageRef.child(selectedFile.name);
				const metadata = {
					"content-type": selectedFile.type
				};
				fileRef.put(selectedFile, metadata).then((snapshot) => {
					console.log('Uploaded a blob or file!');
					fileRef.getDownloadURL().then(async (downloadURL) => {
						console.log("File available at", downloadURL);
						filename = downloadURL;
						await rhit.fbEntriesManager.add(title, content, date, tags, filename);
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

		rhit.fbSingleEntryManager = new rhit.FbSingleEntryManager(entryID);
		var selectedFile = rhit.fbSingleEntryManager.filename();
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
		this.loadView();

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
				rhit.fbSingleEntryManager.update(title, content, date, tags, filename);
				window.location.href = "entry-list.html";
			}else{
				var fileRef = rhit.storageRef.child(selectedFile.name);
				const metadata = {
					"content-type": selectedFile.type
				};
				fileRef.put(selectedFile, metadata).then((snapshot) => {
					console.log('Uploaded a blob or file!');
					fileRef.getDownloadURL().then((downloadURL) => {
						console.log("File available at", downloadURL);
						filename = downloadURL;
						rhit.fbSingleEntryManager.update(title, content, date, tags, filename);
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

	loadView(){
		document.querySelector("#entryName").value = rhit.fbSingleEntryManager.title();
		document.querySelector("#entryContent").value = rhit.fbSingleEntryManager.content();
		document.querySelector("#datePicker").value = rhit.fbSingleEntryManager.date();
		fileInput.files[0] = selectedFile;
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
		if(rhit.fbSingleEntryManager.tags().includes(tag)){
			document.getElementById(`#${tag.name}`).checked = true;
		}
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


/* Main */
/** function and class syntax examples */
rhit.main = function () {
	console.log("Ready");

	rhit.fbAuthManager = new rhit.FbAuthManager();
	rhit.fbAuthManager.beginListening(() => {
		console.log("auth change callback");
		console.log("isSignedIn = ", rhit.fbAuthManager.getIsSignedIn());
	}).then(() => {
		rhit.fbUserManager = new rhit.FbUserManager();
	new rhit.NavbarController();

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
	if (document.querySelector("#loginPage"))
	{
		console.log("On login page");
		new rhit.LoginPageController();
	}
	if (document.querySelector("#editProfilePage"))
	{
		console.log("On edit profile page");
		new rhit.ProfilePageController();
	}
	});
};

rhit.main();
