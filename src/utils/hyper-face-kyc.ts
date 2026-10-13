import { router } from "expo-router";
import { Alert } from "react-native";
import { HyperKycResult } from "../components/HyperKYCFace";
import { goBackWithFallback } from "@/src/services/navigation/goBackWithFallback";
import { consoleLogDev } from "./common-helper";

type HyperKycConfig = {
	accessToken: string;
	workflowId: string;
	transactionId: string;
	showLandingPage: boolean;
};

const DEFAULT_IMPUT_IMAGE = `https://plus.unsplash.com/premium_photo-1664298528358-790433ba0815?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`

export const buildHyperKycHtml = (sdkVersion: string, config: HyperKycConfig, inputImage?: string): string => {
	const configJson = JSON.stringify(config);
	const sdkSrc = `https://hv-web-sdk-cdn.hyperverge.co/hyperverge-web-sdk@${sdkVersion}/src/sdk.min.js`;

	return `
    <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background: #ffffff;
            }
            #hyperkyc-root {
              width: 100%;
              height: 100%;
            }
            #hyperkyc-status {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
              color: #6b7280;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              font-size: 14px;
              text-align: center;
              background: #ffffff;
            }
            #hyperkyc-status.error {
              color: #b91c1c;
            }
          </style>
        </head>
        <body>
          <div id="hyperkyc-root"></div>
          <div id="hyperkyc-status">Loading verification...</div>
          <script>
            window.__HYPERKYC_CONFIG__ = ${configJson};
          </script>
          <script>
            (function () {
              var statusEl = document.getElementById('hyperkyc-status');
              var originalConsole = window.console || {};
  
              function setStatus(message, isError) {
                if (!statusEl) return;
                statusEl.textContent = message;
                statusEl.className = isError ? 'error' : '';
              }
  
              function hideStatus() {
                if (statusEl) {
                  statusEl.style.display = 'none';
                }
              }
  
              function postMessage(payload) {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(payload));
                }
              }
  
              function forwardLog(level, args) {
                try {
                  postMessage({
                    type: 'log',
                    level: level,
                    message: Array.prototype.slice.call(args).map(String).join(' '),
                  });
                } catch (err) {
                  // no-op
                }
              }
  
              window.console = {
                log: function () {
                  if (originalConsole.log) originalConsole.log.apply(originalConsole, arguments);
                  forwardLog('log', arguments);
                },
                warn: function () {
                  if (originalConsole.warn) originalConsole.warn.apply(originalConsole, arguments);
                  forwardLog('warn', arguments);
                },
                error: function () {
                  if (originalConsole.error) originalConsole.error.apply(originalConsole, arguments);
                  forwardLog('error', arguments);
                },
              };
  
              window.onerror = function (message, source, lineno, colno, error) {
                postMessage({
                  type: 'log',
                  level: 'error',
                  message: 'Window error: ' + message,
                  raw: { source: source, lineno: lineno, colno: colno, error: error && error.message },
                });
                setStatus('HyperKYC crashed. Please try again.', true);
              };
  
              window.onunhandledrejection = function (event) {
                var reason = event && event.reason ? event.reason : 'Unknown rejection';
                postMessage({
                  type: 'log',
                  level: 'error',
                  message: 'Unhandled rejection: ' + reason,
                });
                setStatus('HyperKYC failed to start. Please retry.', true);
              };
  
              function launchSdk() {
                // High-level entry log (do NOT log tokens)
                postMessage({
                  type: 'log',
                  level: 'log',
                  message: 'launchSdk: called',
                });
  
                var cfg = window.__HYPERKYC_CONFIG__;
                if (!cfg || !cfg.accessToken || !cfg.workflowId || !cfg.transactionId) {
                  postMessage({
                    type: 'log',
                    level: 'error',
                    message:
                      'launchSdk: Missing HyperKYC configuration (accessToken/workflowId/transactionId). ' +
                      'hasCfg=' + !!cfg +
                      ', hasAccessToken=' + !!(cfg && cfg.accessToken) +
                      ', hasWorkflowId=' + !!(cfg && cfg.workflowId) +
                      ', hasTransactionId=' + !!(cfg && cfg.transactionId),
                  });
                  setStatus('Missing HyperKYC configuration. Please try again.', true);
                  postMessage({ type: 'error', message: 'Missing HyperKYC configuration' });
                  return;
                }
  
                var HKC = window.HyperKycConfig || window.HyperKYCConfig || (typeof HyperKycConfig !== 'undefined' ? HyperKycConfig : null);
                var HKM = window.HyperKycModule || window.HyperKYCModule || (typeof HyperKYCModule !== 'undefined' ? HyperKYCModule : null);
  
                // Log which globals we actually see
                postMessage({
                  type: 'log',
                  level: 'log',
                  message: 'launchSdk: checking HyperKYC globals',
                  raw: {
                    hasConfigCtor: !!HKC,
                    hasModule: !!HKM,
                    hasLaunch: !!(HKM && HKM.launch),
                  },
                });
  
                if (!HKC || !HKM || !HKM.launch) {
                  setStatus('HyperKYC SDK not available. Please try again.', true);
                  postMessage({
                    type: 'error',
                    message: 'HyperKYC globals not found',
                    raw: {
                      hasConfig: !!HKC,
                      hasModule: !!HKM,
                      hasLaunch: !!(HKM && HKM.launch),
                      globals: Object.keys(window || {}).slice(0, 50),
                    },
                  });
                  return;
                }
  
                var hyperKycConfig = new HKC(
                  cfg.accessToken,
                  cfg.workflowId,
                  cfg.transactionId,
                  !!cfg.showLandingPage
                );
  
                var handler = function (result) {
                  try {
                    postMessage({
                      type: 'log',
                      level: 'log',
                      message:
                        'launchSdk: handler called with status=' + result.status +
                        ', code=' + (result.code || ''),
                    });
                  } catch (e) {
                    // ignore logging failure
                  }
                  postMessage({ type: 'result', result: result });
                };
  
                try {
                  postMessage({
                    type: 'log',
                    level: 'log',
                    message: 'launchSdk: calling HKM.launch',
                  });
                  hideStatus();
                  Promise.resolve(HKM.launch(hyperKycConfig, handler))
                    .then(function () {
                      postMessage({
                        type: 'log',
                        level: 'log',
                        message: 'launchSdk: HKM.launch promise resolved',
                      });
                    })
                    .catch(function (err) {
                      setStatus('HyperKYC failed to launch. Please retry.', true);
                      postMessage({
                        type: 'error',
                        message:
                          (err && err.message) || 'HyperKYC launch failed (promise rejection)',
                        raw: err,
                      });
                    });
                      hyperKycConfig.setInputs({
                        "input_image": "${inputImage || DEFAULT_IMPUT_IMAGE}"
                      });
                } catch (err) {
                  setStatus('HyperKYC failed to launch. Please retry.', true);
                  postMessage({
                    type: 'error',
                    message:
                      (err && err.message) || 'HyperKYC launch failed (synchronous error)',
                    raw: err,
                  });
                }
              }
  
              function loadSdk() {
                postMessage({
                  type: 'log',
                  level: 'log',
                  message: 'loadSdk: creating script tag for HyperKYC SDK',
                  raw: {
                    src: "${sdkSrc}",
                    readyState: document.readyState,
                    location: (window.location && window.location.href) || null,
                    userAgent: navigator.userAgent,
                  },
                });
  
                var sdkScript = document.createElement('script');
                sdkScript.src = "${sdkSrc}";
                sdkScript.async = true;
  
                sdkScript.onload = function () {
                  postMessage({
                    type: 'log',
                    level: 'log',
                    message: 'loadSdk: HyperKYC SDK script onload fired',
                    raw: {
                      src: sdkScript.src,
                    },
                  });
                  launchSdk();
                };
  
                sdkScript.onerror = function (event) {
                  var errorDetails = {
                    type: event && event.type,
                    message: (event && event.message) || null,
                    targetSrc:
                      (event && event.target && event.target.src) || sdkScript.src || null,
                    // Some WebViews expose more fields; keep it defensive
                    rawEventKeys: event ? Object.keys(event) : [],
                  };
                  setStatus('Failed to load HyperKYC SDK. Check your connection.', true);
                  postMessage({
                    type: 'error',
                    message: 'Failed to load HyperKYC SDK (script.onerror)',
                    raw: errorDetails,
                  });
                };
  
                try {
                  document.head.appendChild(sdkScript);
                  postMessage({
                    type: 'log',
                    level: 'log',
                    message: 'loadSdk: script tag appended to document.head',
                  });
                } catch (e) {
                  setStatus('Failed to load HyperKYC SDK. Please try again.', true);
                  postMessage({
                    type: 'error',
                    message: 'Failed to append HyperKYC SDK script tag',
                    raw: { message: e && e.message },
                  });
                }
              }
  
              if (document.readyState === 'complete' || document.readyState === 'interactive') {
                loadSdk();
              } else {
                window.addEventListener('load', loadSdk);
              }
            })();
          </script>
        </body>
      </html>
    `;
};


export const handleResult = (result: HyperKycResult) => {
  consoleLogDev('Result', result);
  // Handle successful verification result
  if (result.status === 'auto_approved') {
    Alert.alert('Verification Successful', 'Your face has been verified successfully.', [
      { text: 'OK', onPress: () => goBackWithFallback(router) },
    ]);
  } else if (result.status === 'auto_declined') {
    Alert.alert(
      'Verification Failed',
      result.message || 'Face verification could not be completed. Please try again.',
      [{ text: 'OK', onPress: () => goBackWithFallback(router) }]
    );
  } else if (result.status === 'needs_review') {
    Alert.alert(
      'Under Review',
      'Your verification is under review. You will be notified once it is complete.',
      [{ text: 'OK', onPress: () => goBackWithFallback(router) }]
    );
  } else if (result.status === 'user_cancelled') {
    // User cancelled - just go back silently
    goBackWithFallback(router);
  } else if (result.status === 'error') {
    // Handle error status with proper error message
    const errorMessage =
      result.message ||
      (result.raw && typeof result.raw === 'object' && 'errorMessage' in result.raw
        ? String(result.raw.errorMessage)
        : 'An error occurred during verification. Please try again.');
    Alert.alert('Verification Error', errorMessage, [
      { text: 'OK', onPress: () => goBackWithFallback(router) },
    ]);
  } else {
    // Fallback for unknown statuses
    Alert.alert(
      'Verification Error',
      result.message || 'An unexpected error occurred during verification.',
      [{ text: 'OK', onPress: () => goBackWithFallback(router) }]
    );
  }
};
