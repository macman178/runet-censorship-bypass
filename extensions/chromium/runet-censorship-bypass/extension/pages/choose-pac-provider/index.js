'use strict';

chrome.runtime.getBackgroundPage( (backgroundPage) =>
  backgroundPage.apis.errorHandlers.installListenersOnAsync(
    window, 'POPUP', () => {

      const getStatus = () => document.querySelector('#status');

      const setStatusTo = (msg) => {

        getStatus().innerHTML = msg;

      };

      const antiCensorRu = backgroundPage.apis.antiCensorRu;
      const errorHandlers = backgroundPage.apis.errorHandlers;

      // SET DATE

      const setDate = () => {

        let dateForUser = 'никогда';
        if( antiCensorRu.lastPacUpdateStamp ) {
          let diff = Date.now() - antiCensorRu.lastPacUpdateStamp;
          let units = 'мс';
          const gauges = [
            [1000, 'с'],
            [60, 'мин'],
            [60, 'ч'],
            [24, 'дн'],
            [7, ' недель'],
            [4, ' месяцев'],
          ];
          for(const g of gauges) {
            const diffy = Math.floor(diff / g[0]);
            if (!diffy)
              break;
            diff = diffy;
            units = g[1];
          }
          dateForUser = diff + units + ' назад';
        }

        const dateElement = document.querySelector('.update-date');
        dateElement.innerText = dateForUser + ' / ' +
          (antiCensorRu.pacUpdatePeriodInMinutes/60) + 'ч';
        dateElement.title = new Date(antiCensorRu.lastPacUpdateStamp)
          .toLocaleString('ru-RU');

      };

      setDate();
      chrome.storage.onChanged.addListener(
        (changes) => changes.lastPacUpdateStamp.newValue && setDate()
      );

      // CLOSE BUTTON

      document.querySelector('.close-button').onclick = () => window.close();

      // RADIOS

      const currentProviderRadio = () => {

        const id = antiCensorRu.getCurrentPacProviderKey() || 'none';
        return document.getElementById(id);

      };
      const checkChosenProvider = () => currentProviderRadio().checked = true;

      const showErrors = (err, warns) => {

        warns = warns || [];
        const warning = warns
          .map( (w) => '✘ ' + (w.clarification && w.clarification.message || w.message || '') )
          .join('<br/>');

        let message = '';
        if (err) {
          let clarification = err.clarification;
          message = err.message || '';

          while( clarification ) {
            message = (clarification && (clarification.message + ' ')) + message;
            clarification = clarification.prev;
          }
        }
        message = message.trim();
        if (warning) {
          message += ' ' + warning;
        }
        setStatusTo(
          `<span style="color:red">
          ${err ? '🔥 Ошибка!' : 'Некритичная ошибка.'}
          </span>
          <br/>
          <span style="font-size: 0.9em; color: darkred">${message}</span>
          ${err ? '<a href class="link-button">[Ещё&nbsp;подробнее]</a>' : ''}`
        );
        if (err) {
          getStatus().querySelector('.link-button').onclick = function() {

            errorHandlers.viewErrorVoid(err);
            return false;

          };
        }

      };

      const enableDisableInputs = function() {

        const inputs = document.querySelectorAll('input');
        for ( let i = 0; i < inputs.length; i++ ) {
          inputs[i].disabled = !inputs[i].disabled;
        }

      };

      const conduct = (beforeStatus, operation, afterStatus, onSuccess) => {

        setStatusTo(beforeStatus);
        enableDisableInputs();
        operation((err, res, warns) => {
          if (err || warns) {
            showErrors(err, warns);
          } else {
            setStatusTo(afterStatus);
          }
          if (!err) {
            onSuccess && onSuccess();
          }
          enableDisableInputs();
        });

      };

      const ul = document.querySelector('#list-of-providers');
      const _firstChild = ul.firstChild;
      for(
        const providerKey of Object.keys(antiCensorRu.pacProviders).sort()
      ) {
        const provider = antiCensorRu.getPacProvider(providerKey);
        const li = document.createElement('li');
        li.className = 'provider';
        li.innerHTML = `
          <input type="radio" name="pacProvider" id="${providerKey}">
          <label for="${providerKey}"> ${provider.label}</label>
          <a href class="link-button checked-radio-panel"
            id="update-${providerKey}"> [обновить]</a>
          <div class="desc">
            &nbsp;<i class="fa fa-question-circle" aria-hidden="true"></i>
            <div class="tooltip">${provider.desc}</div>
            <div class="xyz">${provider.desc}</div>
          </div>
          `
        li.querySelector('.link-button').onclick =
          () => {
            conduct(
              'Обновляем...', (cb) => antiCensorRu.syncWithPacProviderAsync(cb),
              'Обновлено.'
            );
            return false;
          };
        ul.insertBefore( li, _firstChild );
      }
      checkChosenProvider();

      const radios = [].slice.apply(
        document.querySelectorAll('[name=pacProvider]')
      );
      for(const radio of radios) {
        radio.onclick = function(event) {

          if (
            event.target.id === (antiCensorRu.getCurrentPacProviderKey() || 'none')
          ) {
            return false;
          }
          const pacKey = event.target.id;
          if (pacKey === 'none') {
            conduct(
              'Отключение...',
              (cb) => antiCensorRu.clearPacAsync(cb),
              'Отключено.',
              checkChosenProvider
            );
          } else {
            conduct(
              'Установка...',
              (cb) => antiCensorRu.installPacAsync(pacKey, cb),
              'PAC-скрипт установлен.',
              checkChosenProvider
            );
          }
          return false;
        };
      }

      const conpanel = document.getElementById('list-of-handlers');
      errorHandlers.getEventsMap().forEach( (value, name) => {

        const li = document.createElement('li');
        li.innerHTML = `
          <input type="checkbox" id="if-on-${name}"/>
          <label for="if-on-${name}">${value}</label>`;
        const box = li.querySelector('input');
        box.checked = backgroundPage.apis.errorHandlers.isOn(name);
        box.onclick = function() {

          const id = this.id.replace('if-on-', '');
          return backgroundPage.apis.errorHandlers.switchVoid(
            this.checked ? 'on' : 'off',
            id
          );

        };
        conpanel.appendChild(li);

      });

      if( errorHandlers.ifNotControlled ) {
        document.getElementById('which-extension').innerHTML
          = backgroundPage.utils.messages.whichExtensionHtml();
        document.querySelectorAll('.if-not-controlled').forEach( (node) => {

          node.style.display = 'block';

        });
      }
      setStatusTo('');

      if (antiCensorRu.ifFirstInstall) {
        const id = antiCensorRu.getCurrentPacProviderKey() || 'none';
        document.querySelector('#update-' + id).click();
      }
      document.documentElement.style.display = '';

    })
);