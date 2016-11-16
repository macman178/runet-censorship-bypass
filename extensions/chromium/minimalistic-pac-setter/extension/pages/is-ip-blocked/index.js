'use strict';
chrome.runtime.getBackgroundPage( (backgroundPage) => {

  const hostname = window.location.search.substring(1);

  backgroundPage.getOneDnsRecord( { host: hostname, type: 'A' }, (err, records) =>
    err
      ? document.write(
          `<title>IP уже нет</title>
          Не могу получить IP для домена "${hostname}". Домена уже нет?<br/>
          Ошибка:<br/>
          ${err.clarification && err.clarification.message || err.message}`
        )
      : records.length === 1 && records[0].type === 'A'
        ? window.location.replace( backgroundPage.reestrUrl + records[0].data )
        : document.write(
              '<title>Выбор IP</title>'
            + '<h4>У домена несколько IP / синонимов. Для вашего местоположения:</h4>'
            + records
              .sort( (a,b) => a.data.localeCompare(b.data) )
              .map( ans => ans.data.link( ans.type === 'A' ? backgroundPage.reestrUrl + ans.data : window.location.pathname +'?'+ ans.data ) )
              .join('<br/>')
          )
  )

})