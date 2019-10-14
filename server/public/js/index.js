$(function () {

  const media = window.matchMedia("(max-width: 700px)");

  const log_viewer = $('#log-view');

  function log(str, color = 'white') {
    log_viewer.prepend(`<p style="color: ${color};">[${new Date().toLocaleString('en-US')}] : ${str}</p>`);
  }

  // Enable navbar tab
  $('#myTab a').on('click', function (e) {
    e.preventDefault();
    if (this.innerText == 'CODE') {
      if (media.matches) {
        right_panel.hide();
        left_panel.show();
        right_panel.css('left', '40vw');
      }
    } else {
      if (media.matches) {
        left_panel.hide();
        right_panel.show();
        right_panel.css('left', '0');
      }
    }
    $(this).tab('show')
  });

  var mobile = media.matches;

  window.onresize = function (ui) {
    if (media.matches && mobile == false) {
      mobile = true;
      left_panel.show();
      right_panel.hide();
    } else if (!media.matches && mobile == true) {
      mobile = false;
      left_panel.show();
      right_panel.show();
      right_panel.css('left', '40vw');
    }
  }

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
  var downloadbtn = $('#download-svg');
  var clearbtn = $('#clear-log');
  var submitbtn = $('#submit');
  var btnEvent;

  downloadbtn.tooltip({
    boundary: 'window'
  });

  clearbtn.tooltip({
    boundary: 'window'
  });

  submitbtn.tooltip({
    boundary: 'window'
  });

  var prefix = /^[^.]+/.exec($('#input-selector').val())[0];

  downloadbtn.on('click', (e) => {
    var data = $('<div>').append($('svg').clone()).html().replace(/&nbsp;/g, ' ');
    var dataUrl = 'data:image/svg+xml;base64,' + btoa(data);
    
    var link = $('<a>');
    link.attr('href', dataUrl);
    link.attr('download', prefix + '.svg');
    link.appendTo(document.body);
    link[0].click();
    link.remove();
  });

  clearbtn.on('click', (e) => {
    clearbtn.fadeOut();
    clearbtn.tooltip('hide');
    clearbtn.tooltip('disable');

    log_viewer.html('');

    setTimeout(() => {
      clearbtn.fadeIn();
      submitbtn.tooltip('enable');
    }, 5000);
  });

  submitbtn.on('click', (e) => {

    submitbtn.attr("disabled", true);
    submitbtn.tooltip('hide');
    submitbtn.tooltip('disable');

    var code = editor.getValue();
    var hash = md5(code);
    var color = ((parseInt(hash.substr(0, 6), 16) * 0.3) + 0x222222).toString(16).substr(0, 6)

    log(`New Request Sent (<span style="color: #${color};">${hash}</span>)`);

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
          code: code
        })
      })
      .then(res => res.json())
      .then((data) => {
        if (!data.success) {
          log(`An error occurred ("${data.message}")`, '#ff6b6b');
          throw new Error('failed');
        }

        astviewer.jsonViewer(JSON.parse(data.ast), {
          collapsed: true,
          rootCollapsable: false
        });

        let viz = new Viz();
        viz.renderSVGElement(data.cfg)
          .then((element) => {
            cfgviewer.html(element);

            log('Received a normal response', '#46f5af');
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
  $('.CodeMirror').resizable({
    resize: (event, ui) => {
      var new_width = ui.size.width;
      left_panel.width(new_width);
      right_panel.css('left', new_width + 'px');
    }
  });

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