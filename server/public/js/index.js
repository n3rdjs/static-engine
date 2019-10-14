$(function () {

  // Enable navbar tab
  $('#myTab a').on('click', function (e) {
    e.preventDefault()
    $(this).tab('show')
  })
  // Set editor
  var editor = CodeMirror.fromTextArea(source, {
    mode: 'javascript',
    theme: 'material-palenight',
    lineNumbers: true,
    viewportMargin: Infinity,
    lineWrapping: true,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
  });

  var astviewer = $('#ast-view');
  var cfgviewer = $('#cfg-view');
  var submitbtn = $('#submit');
  var btnEvent;

  submitbtn.tooltip({
    boundary: 'window'
  })

  $('#submit').on('click', function (e) {

    submitbtn.attr("disabled", true);
    submitbtn.tooltip('hide');
    submitbtn.tooltip('disable');

    btnEvent = setTimeout(function () {
      submitbtn.removeClass();
      submitbtn.addClass('btn btn-dark');
      submitbtn.html('<span class="spinner spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>\nLoading...');
    }, 1000);

    fetch('/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: editor.getValue()
        })
      })
      .then(res => res.json())
      .then((data) => {
        astviewer.jsonViewer(JSON.parse(data.ast), {
          collapsed: true,
          rootCollapsable: false
        });

        let viz = new Viz();
        viz.renderSVGElement(data.cfg)
          .then((element) => {
            cfgviewer.html(element);

            submitbtn.removeClass();
            submitbtn.addClass('btn btn-success');
            submitbtn.html('Success');
            clearTimeout(btnEvent);

            btnEvent = setTimeout(function () {
              submitbtn.removeClass();
              submitbtn.addClass('btn btn-primary');
              submitbtn.html('Submit');
              submitbtn.attr("disabled", false);
              submitbtn.tooltip('enable');
            }, 500);
          });

      }).catch(err => {
        submitbtn.removeClass();
        submitbtn.addClass('btn btn-danger');
        submitbtn.html('Error');
        clearTimeout(btnEvent);

        btnEvent = setTimeout(function () {
          submitbtn.removeClass();
          submitbtn.addClass('btn btn-primary');
          submitbtn.html('Submit');
          submitbtn.attr("disabled", false);
          submitbtn.tooltip('enable');
        }, 500);
      });
  });

  $('#submit').click();

  $('.CodeMirror').keydown((e) => {
    if (e.ctrlKey && e.which == 13) {
      $('#submit').click();
    }
  });

  var left_panel = $('.panel-left');
  var right_panel = $('.panel-right');

  $('.CodeMirror').addClass('ui-widget-content');
  $('.CodeMirror').resizable({ resize: ( event, ui ) => {
    var new_width = ui.size.width;
    console.log(new_width);
    left_panel.width(new_width);
    right_panel.width($(window).width() - new_width);
  }});

  $('#input-selector').change((e) => {
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = '/';

    var params = {
      filename: e.target.value
    };

    for (let key in params) {
      if (params.hasOwnProperty(key)) {
        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.name = key;
        hiddenField.value = params[key];

        form.appendChild(hiddenField);
      }
    }

    document.body.appendChild(form);
    form.submit();
  });

});