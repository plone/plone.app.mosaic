module("undo", {
    setup: function () {
    },
    teardown: function () {
    }
});

test("Initialize stack", function() {
    expect(3);

    // Initialise stack
    var stack = new $.deco.undo.Stack();

    equals(stack.size(), 0, "Stack empty initially");
    equals(stack.maxsize, 10, "Default stack size 10");

    stack = new $.deco.undo.Stack(20);

    equals(stack.maxsize, 20, "Default stack size 20");
});

test("Manipulate stack", function() {
    expect(6);

    // Initialise stack
    var stack = new $.deco.undo.Stack();

    stack.add("foo0");

    equals(stack.get(0), "foo0", "pop after push should get same object")

    for (var i = 0; i < 20; i++) {
      stack.add("foo" + i);
    }

    equals(stack.size(), 10, "Stack has max 10 elements");

    equals(stack.get(0), "foo19", "Last object is last pushed")
    equals(stack.get(1), "foo18", "Second object")
    equals(stack.get(2), "foo17", "Get third object")

    equals(stack.size(), 10, "Stack has still 10 elements left");
});


test("Undo manager", function() {
    expect(6);

    var state = "state0";

    function handle(newState) {
      state = newState;
    }

    // setup undo manager
    var undo = new $.deco.undo.UndoManager(10, handle, state);

    undo.undo();

    equals(state, "state0", "Undo has nothing to undo yet");

    undo.add("state1");
    undo.add("state2");

    undo.undo();

    equals(state, "state1", "State1 now current");

    undo.redo();

    equals(state, "state2", "Back at state 2");

    undo.undo();

    equals(state, "state1", "State1 now current");

    undo.undo();

    equals(state, "state0", "State0 now current");

    undo.undo();

    equals(state, "state0", "State0 still current");

});
