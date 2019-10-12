let editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/javascript");

function analyze() {
    let code = editor.getValue();
    console.log(code);

    let data = {code: code};
    fetch('./analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    }).then(function(response) {
        response.json().then((data) => {
            console.log(data);
            if(data.success) {
                let viz = new Viz();
                viz.renderSVGElement(data.cfg)
                .then((element) => {
                    let area = document.getElementById("svg-draw");
                    area.innerHTML = ''
                    area.appendChild(element);
                })
                .catch((error) => {
                    viz = new Viz();
                    alert(error);
                })
            }
            else {
                alert(data.message);
            }
        });
    })
}