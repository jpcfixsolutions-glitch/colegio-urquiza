import assert from "node:assert/strict";
import test from "node:test";
import { createRequestGate } from "../src/api/requestGate.js";

test("la respuesta de una vista abandonada queda invalidada al iniciar otra",()=>{const gate=createRequestGate(),announcements=gate.start(),payslips=gate.start();assert.equal(announcements.signal.aborted,true);assert.equal(gate.isCurrent(announcements),false);assert.equal(gate.isCurrent(payslips),true)});
test("cancelar al desmontar invalida y aborta el request pendiente",()=>{const gate=createRequestGate(),request=gate.start();gate.cancel();assert.equal(request.signal.aborted,true);assert.equal(gate.isCurrent(request),false)});
test("alternar rápidamente entre avisos y recibos conserva sólo el último request",()=>{const gate=createRequestGate();let request;for(let index=0;index<40;index+=1)request=gate.start();assert.equal(gate.isCurrent(request),true);assert.equal(request.signal.aborted,false);gate.cancel();assert.equal(request.signal.aborted,true)});
