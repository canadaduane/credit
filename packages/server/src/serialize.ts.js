import { text } from "js-crdt";
import { OrderedOperations } from "js-crdt/build/text";

/*+
type SerializedOrder = Object;
export type SerializedOrderedOperations = {
  operations: Array<any>;
  order: SerializedOrder;
};
*/

export function serializeOperations(
  oo /*: OrderedOperations */
) /*: SerializedOrderedOperations */ {
  return oo.operations.reduce(
    (result, operation) => {
      let value;

      if (operation instanceof crdt.text.Insert) {
        value = { type: "insert", args: [operation.at, operation.value] };
      }
      if (operation instanceof crdt.text.Delete) {
        value = { type: "delete", args: [operation.at, operation.length] };
      }
      if (operation instanceof crdt.text.Selection) {
        value = {
          type: "selection",
          args: [operation.origin, operation.at, operation.length],
        };
      }

      if (value) {
        result.operations.push(value);
      }

      return result;
    },
    {
      operations: [],
      order: serializeOrder(oo.order),
    }
  );
}

function serializeOrder(order) {
  if (order instanceof crdt.order.VectorClock) {
    function serializeId(id) {
      return {
        node: id.node,
        version: id.version,
      };
    }

    return {
      t: "v2",
      id: serializeId(order.id),
      vector: order.vector.reduce((r, item) => {
        r.push(serializeId(item));
        return r;
      }, []),
    };
  }
}

function deserializeOrder(t, id, vector) {
  switch (t) {
    case "v2":
      const set = new crdt.structures.SortedSetArray(
        new crdt.structures.NaiveArrayList([])
      );

      return new crdt.order.VectorClock(
        new crdt.order.Id(id.node, id.version),
        vector.reduce((set, id) => {
          return set.add(new crdt.order.Id(id.node, id.version)).result;
        }, set)
      );
  }
}

export function deserializeOperations({
  order,
  operations,
}) /*: OrderedOperations */ {
  const { t, id, vector } = order;

  return {
    order: deserializeOrder(t, id, vector),
    operations: operations.reduce((operations, { type, args }) => {
      let operation;

      switch (type) {
        case "insert":
          operation = new crdt.text.Insert(args[0], args[1]);
          break;
        case "delete":
          operation = new crdt.text.Delete(args[0], args[1]);
          break;
        case "selection":
          operation = new crdt.text.Selection(args[0], args[1], args[2]);
          break;
      }

      if (operation) {
        operations.push(operation);
      }

      return operations;
    }, []),
  };
}
