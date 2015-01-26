$(function () {
    $('#container').bind('click', function () {
        console.log("click");
        var names = [
            'yes',
            'no',
            //'shake',
            'question'
        ];
        var name = names[parseInt(Math.random() * names.length)];
        console.log(name);
        motionMgr.startMotion(motions[name]);
    });
    $('#help-btn').click(function (e) {
        var canvas = $('#glcanvas');


        if (canvas.hasClass('flipOutY') && !canvas.hasClass('flipInY')) {
            canvas.removeClass('flipOutY');
            canvas.addClass('flipInY');
        } else {
            canvas.removeClass('flipInY');
            canvas.addClass('flipOutY');
        }
        e.preventDefault();
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

var CanvasDetector = {
    canCanvas: function () {
        return !!window.CanvasRenderingContext2D
    },
    canWebGL: function () {
        try {
            return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
        } catch (e) {
            return false;
        }
    }
};

if (!CanvasDetector.canWebGL()) {
    alert("WebGL非対応の環境では動作しません");
}
