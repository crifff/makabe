$(function () {
    $('#container').bind('click', function () {
        console.log("click");
        motionMgr.startMotion(motions['yes']);
    });
});

// スクロールを抑止する関数
function preventScroll(event) {
    // li要素だけは、タップイベントに反応したいので、抑止しない。
    if (!event.touches[0] || event.touches[0].target.tagName.toLowerCase() == "div") {
        return;
    }

    // preventDefaultでブラウザ標準動作を抑止する。
    event.preventDefault();
}

// タッチイベントの初期化
document.addEventListener("touchmove", preventScroll, false);