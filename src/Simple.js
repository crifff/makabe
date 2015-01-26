/**
 *  Sample.js
 *
 *  You can modify and use this source freely
 *  only for the development of application related Live2D.
 *
 *  (c) Live2D Inc. All rights reserved.
 */
hoge = null;
var Simple = function () {
    Simple.mylog("--> Simple()");

    /**
     * Live2Dモデルのインスタンス
     */
    this.live2DModel = null;

    /**
     * アニメーションを停止するためのID
     */
    this.requestID = null;

    /**
     * モデルのロードが完了したら true
     */
    this.loadLive2DCompleted = false;

    /**
     * モデルの初期化が完了したら true
     */
    this.initLive2DCompleted = false;

    /**
     * WebGL Image型オブジェクトの配列
     */
    this.loadedImages = [];
    this.motion = null;     // モーション
    this.motions = {};     // モーション
    this.motionMgr = null;  // モーションマネジャー


    this.mousedown = false;
    this.mousemove = false;
    this.point = {x: 0, y: 0};

    var isTouch = ('ontouchstart' in window);
    if (isTouch) {
        var start = 'touchstart';
        var end = 'touchend';
        var move = 'touchmove';
        var handler = function (e) {
            if (mousedown) {
                mousemove = true;
                var touch = e.originalEvent.touches[0];
                var x = (touch.pageX / 160 ) - 1;
                var y = ((touch.pageY / 240) - 1) * -1;
                point = {x: x, y: y};
                console.log(point);
            }
        };
    } else {
        var start = 'mousedown';
        var end = 'mouseup';
        var move = 'mousemove';

        var handler = function (e) {
            if (mousedown) {
                mousemove = true;
                var x = (e.clientX / 160 ) - 1;
                var y = ((e.clientY / 240) - 1) * -1;
                point = {x: x, y: y};
                console.log(point);
            }
        };
    }

    $("#container").bind(start, function (e) {
        console.log("down");
        mousedown = true;
    }).bind(end, function () {
        console.log("up");
        mousedown = false;

        mousemove = false;
    }).bind(move, handler);

    /**
     * Live2D モデル設定。
     */
    this.modelDef = {
        "type": "Live2D Model Setting",
        "name": "miku",
        "model": "model/makabe.moc",
        "textures": [
            "model/makabe.1024/texture_00.png"
        ],
        "motions": {
            "idle": "motions/miku_idle_01.mtn",
            "yes": "motions/miku_m_01.mtn",
            "no": "motions/miku_m_02.mtn",
            "question": "motions/miku_m_03.mtn",
            "smile": "motions/miku_m_04.mtn",
            "angry": "motions/miku_m_05.mtn",
            "sad": "motions/miku_m_06.mtn",
            "shake": "motions/miku_shake_01.mtn"
        },
    };

    // Live2Dの初期化
    Live2D.init();

    // canvasオブジェクトを取得
    var canvas = document.getElementById("glcanvas");

    // コンテキストを失ったとき

    canvas.addEventListener("webglcontextlost", function (e) {
        Simple.myerror("context lost");
        loadLive2DCompleted = false;
        initLive2DCompleted = false;

        var cancelAnimationFrame =
            window.cancelAnimationFrame ||
            window.mozCancelAnimationFrame;
        cancelAnimationFrame(requestID); //アニメーションを停止

        e.preventDefault();
    }, false);

    // コンテキストが復元されたとき
    canvas.addEventListener("webglcontextrestored", function (e) {
        Simple.myerror("webglcontext restored");
        Simple.initLoop(canvas);
    }, false);

    // Init and start Loop
    Simple.initLoop(canvas);
};


/**
 * WebGLコンテキストを取得・初期化。
 * Live2Dの初期化、描画ループを開始。
 */
Simple.initLoop = function (canvas/*HTML5 canvasオブジェクト*/) {
    Simple.mylog("--> initLoop");

    //------------ WebGLの初期化 ------------

    // WebGLのコンテキストを取得する
    var gl = Simple.getWebGLContext(canvas);
    if (!gl) {
        Simple.myerror("Failed to create WebGL context.");
        return;
    }

    // 描画エリアを白でクリア
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    //------------ Live2Dの初期化 ------------

    // mocファイルからLive2Dモデルのインスタンスを生成
    Simple.loadBytes(modelDef.model, function (buf) {
        live2DModel = Live2DModelWebGL.loadModel(buf);
    });
    // モーションのロード
    for (var mname in  modelDef.motions) {
        (function (name) {
            Simple.loadBytes(modelDef.motions[name], function (buf) {
                motions[name] = new Live2DMotion.loadMotion(buf);
                motion = motions['idle'];
            });
        })(mname);
    }
    motionMgr = new L2DMotionManager();

    // テクスチャの読み込み
    var loadCount = 0;
    for (var i = 0; i < modelDef.textures.length; i++) {
        (function (tno) {// 即時関数で i の値を tno に固定する（onerror用)
            loadedImages[tno] = new Image();
            loadedImages[tno].src = modelDef.textures[tno];
            loadedImages[tno].onload = function () {
                if ((++loadCount) == modelDef.textures.length) {
                    loadLive2DCompleted = true;//全て読み終わった
                }
            }
            loadedImages[tno].onerror = function () {
                Simple.myerror("Failed to load image : " + modelDef.textures[tno]);
            }
        })(i);
    }

    //------------ 描画ループ ------------

    (function tick() {
        Simple.draw(gl); // 1回分描画

        var requestAnimationFrame =
            window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame;
        requestID = requestAnimationFrame(tick, canvas);// 一定時間後に自身を呼び出す
    })();
};


Simple.draw = function (gl/*WebGLコンテキスト*/) {
    // Canvasをクリアする
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Live2D初期化
    if (!live2DModel || !loadLive2DCompleted)
        return; //ロードが完了していないので何もしないで返る

    // ロード完了後に初回のみ初期化する
    if (!initLive2DCompleted) {
        initLive2DCompleted = true;

        // 画像からWebGLテクスチャを生成し、モデルに登録
        for (var i = 0; i < loadedImages.length; i++) {
            //Image型オブジェクトからテクスチャを生成
            var texName = Simple.createTexture(gl, loadedImages[i]);

            live2DModel.setTexture(i, texName); //モデルにテクスチャをセット
        }

        // テクスチャの元画像の参照をクリア
        loadedImages = null;

        // OpenGLのコンテキストをセット
        live2DModel.setGL(gl);

        // 表示位置を指定するための行列を定義する
        var size = 1.8;
        var w = 1.0 / live2DModel.getCanvasWidth() * size;
        var h = 1.5 / live2DModel.getCanvasHeight() * size;
        var matrix4x4 = [h, 0, 0, 0, 0, -w, 0, 0, 0, 0, 1, 0, -1.35, 0.78, 0, 1];
        live2DModel.setMatrix(matrix4x4);

    }
    // モーションが終了していたらモーションの再生
    if (motionMgr) {
        if (motionMgr.isFinished()) {
            //Simple.mylog("--> StartMotion");
            motionMgr.startMotion(motions['idle']);
        }
        if (!mousedown) {
            motionMgr.updateParam(live2DModel);
        }
    }
    if (mousemove) {
        //console.log(point);
        //顔の向き
        live2DModel.addToParamFloat("PARAM_ANGLE_X", point['x'] * 30, 1);//-30から30の値を加える
        live2DModel.addToParamFloat("PARAM_ANGLE_Y", point['y'] * 30, 1);
        //体の向きの調整
        live2DModel.addToParamFloat("PARAM_BODY_ANGLE_X", point['x'] * 10, 1);//-10から10の値を加える

        //目の向きの調整
        live2DModel.addToParamFloat("PARAM_EYE_BALL_X", point['x'], 1);//-1から1の値を加える
        live2DModel.addToParamFloat("PARAM_EYE_BALL_Y", point['y'], 1);
    }


    //


    // キャラクターのパラメータを適当に更新
    var t = UtSystem.getTimeMSec() * 0.001 * 2 * Math.PI; //1秒ごとに2π(1周期)増える
    var cycle = 3.0; //パラメータが一周する時間(秒)
    // PARAM_ANGLE_Xのパラメータが[cycle]秒ごとに-30から30まで変化する
    //live2DModel.setParamFloat("PARAM_ANGLE_X", 30 * Math.sin(t/cycle));

    // Live2Dモデルを更新して描画
    live2DModel.update(); // 現在のパラメータに合わせて頂点等を計算
    live2DModel.draw();	// 描画
};


/**
 * WebGLのコンテキストを取得する
 */
Simple.getWebGLContext = function (canvas/*HTML5 canvasオブジェクト*/) {
    var NAMES = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];

    var param = {
        alpha: true,
    };

    for (var i = 0; i < NAMES.length; i++) {
        try {
            var ctx = canvas.getContext(NAMES[i], param);
            if (ctx) return ctx;
        }
        catch (e) {
        }
    }
    return null;
};


/**
 * Image型オブジェクトからテクスチャを生成
 */
Simple.createTexture = function (gl/*WebGLコンテキスト*/, image/*WebGL Image*/) {
    var texture = gl.createTexture(); //テクスチャオブジェクトを作成する
    if (!texture) {
        mylog("Failed to generate gl texture name.");
        return -1;
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);	//imageを上下反転
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    return texture;
};


/**
 * ファイルをバイト配列としてロードする
 */
Simple.loadBytes = function (path, callback) {
    var request = new XMLHttpRequest();
    request.open("GET", path, true);
    request.responseType = "arraybuffer";
    request.onload = function () {
        switch (request.status) {
            case 200:
                callback(request.response);
                break;
            default:
                Simple.myerror("Failed to load (" + request.status + ") : " + path);
                break;
        }
    }
    request.send(null);
    return request;
};


/**
 * 画面ログを出力
 */
Simple.mylog = function (msg/*string*/) {
    console.log(msg);
};

/**
 * 画面エラーを出力
 */
Simple.myerror = function (msg/*string*/) {
    Simple.mylog("<span style='color:red'>" + msg + "</span>");
};