$(function(){
    if (window.matchMedia('(max-width: 960px)').matches) return;
    $('#dowebok').fullpage({
        'navigation': true,
        'navigationPosition':"left",
        'navigationColor':['#fff'],
        afterLoad: function (anchorLink, index) {
            if (typeof window.revealBirthdaySection === 'function') {
                window.revealBirthdaySection(index);
            }
        },

    });
});