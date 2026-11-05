$(function(){
    if (window.matchMedia('(max-width: 960px)').matches) return;
    $('#dowebok').fullpage({
        'navigation': true,
        'navigationPosition':"left",
        'navigationColor':['#fff'],

    });
});