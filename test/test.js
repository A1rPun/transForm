(function () {
    var out = document.getElementById('output'),
        myForm = document.getElementById('myForm'),
		btnSerialize = document.getElementById('serialize'),
		btnDeserialize = document.getElementById('deserialize'),
		btnClear = document.getElementById('clear'),
		btnSubmit = document.getElementById('submit');
	btnSerialize.addEventListener('click', serialize);
	btnDeserialize.addEventListener('click', deserialize);
	btnClear.addEventListener('click', clear);
	btnSubmit.addEventListener('click', submit);
	myForm.addEventListener('submit', function (e) { e.preventDefault() });

	var allInputs = myForm.querySelectorAll('input,textarea,select');
	for (var i = allInputs.length; i--;)
		allInputs[i].addEventListener('change', function () {
			var me = this;
			me.style.backgroundColor = '#BADA55';
			setTimeout(function () {
				me.style.backgroundColor = '';
			}, 1000);
		});

	function getOptions() {
		return transForm.serialize('#options', { useIdOnEmptyName: true });
	}

	function deserialize() {
		var myObject = JSON.parse(out.value);
		transForm.deserialize(myForm, myObject, getOptions());
	}

	function serialize() {
		var obj = transForm.serialize(myForm, getOptions());
		out.value = JSON.stringify(obj, null, 4);
	}

	function clear() {
		transForm.clear(myForm, getOptions());
	}

	function submit() {
	    transForm.submit(myForm, true);
	}
	
	serialize();
	//out.value += '\n'+JSON.stringify(transForm.serialize('.testform'), null, 4);
}());
