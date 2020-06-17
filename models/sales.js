const db = require('../db');
const helper = require('../helpers/date')

module.exports = {

  getLastInvNum: () => {
    return new Promise((resolve, reject) => {
      let queryString = "SELECT * FROM sales;"
      console.log(queryString)

      db.query(queryString, (err, result) => {
        if (err) {
          console.log("Query failed.")
          reject(err);
        } else {
          console.log("Query successful.")
          if (result.rows.length > 0) {
            resolve(result.rows[result.rows.length - 1].sale_id);
          } else {
            resolve(0)
          }
        }
      });
    })
  },

  recordSale: (data) => {
    //Sanitize
    let invoice = {
      date: data.date.split("/")[1] + "/" + data.date.split("/")[0] + "/" + data.date.split("/")[2],
      source: data.source,
      source_ref: data.source_ref,
      pay_mode: data.pay_mode,
      pay_ref: data.pay_ref,
      total: 0
    }

    for (let i = 0; i < data.list.length; i++) {
      invoice.total += (data.list[i].qty * data.list[i].cost)
    }

    return new Promise((resolve, reject) => {
      const queryOne = "INSERT INTO sales (sale_date, sale_value, sale_source, src_ref, pay_mode, pay_ref) VALUES ('" + invoice.date + "', " + invoice.total + ", '" + invoice.source + "', '" + invoice.source_ref + "', '" + invoice.pay_mode + "', '" + invoice.pay_ref + "') RETURNING sale_id;"
      console.log(queryOne);

      db.query(queryOne, (err, result) => {
        if (err) {
          console.log("Query failed.")
          reject(err);
        }
        let sale_id = result.rows[0].sale_id

        let queryTwo = 'INSERT INTO sale_products (sale_id, product_id, quantity, price) VALUES ';
        for (let i = 0; i < data.list.length; i++) {
          if (i == data.list.length - 1) {
            queryTwo += "(" + sale_id + "," + data.list[i].pid + "," + data.list[i].qty + "," + data.list[i].cost + ") RETURNING 1;"
          } else {
            queryTwo += "(" + sale_id + "," + data.list[i].pid + "," + data.list[i].qty + "," + data.list[i].cost + "),"
          }
        }
        console.log(queryTwo);

        db.query(queryTwo, (err, result) => {
          if (err) {
            console.log("Query failed.")
            reject(err);
          }
          if (result) {
            console.log("Query successful.")
            resolve({ message: "Sale successfully recorded." });
          }
        })
      });
    })
  },

  getAllDay: () => {
    let date = helper.todayMMDDYYYY();

    return new Promise((resolve, reject) => {
      let queryString = "SELECT * FROM sale_products INNER JOIN sales ON sales.sale_id = sale_products.sale_id INNER JOIN products ON products.product_id = sale_products.product_id WHERE sale_date = '" + date + "';"
      console.log(queryString);

      db.query(queryString, (err, result) => {
        if (err) {
          console.log("Query failed.")
          reject(err);
        } else {
          console.log("Query successful.")
          let arr = result.rows
          let temp = {};
          let res = [];

          for (let i in arr) {
            if (!temp[arr[i].inv_num]) {
              res.push(
                {
                  inv_no: arr[i].sale_id,
                  date: helper.toDDMMYYYY(arr[i].sale_date),
                  range: helper.toDDMMYYYYstr(helper.todayMMDDYYYY()),
                  total: arr[i].sale_value,
                  source: helper.cap(arr[i].sale_source),
                  src_ref: helper.cap(arr[i].src_ref),
                  pay_mode: helper.cap(arr[i].pay_mode),
                  items: []
                }
              )
              temp[arr[i].inv_num] = true;
            }
          }

          for (let i in res) {
            for (let k in arr)
              if (res[i].inv_no == arr[k].sale_id) {
                res[i].items.push({
                  sku: arr[k].sku,
                  brand: arr[k].brand,
                  model: arr[k].model,
                  qty: arr[k].quantity,
                  price: arr[k].price,
                  subtotal: arr[k].quantity * arr[k].price
                })
              }
          }
          resolve(res);
        }
      });
    })
  },

  search: (body) => {
    let start = helper.toMMDDYYYY(body.start);
    let end = helper.toMMDDYYYY(body.end);

    return new Promise((resolve, reject) => {
      let queryString = "SELECT * FROM sale_products INNER JOIN sales ON sales.sale_id = sale_products.sale_id INNER JOIN products ON products.product_id = sale_products.product_id WHERE sale_date >= '" + start + "' AND sale_date <= '" + end + "';"
      console.log(queryString);

      db.query(queryString, (err, result) => {
        if (err) {
          console.log("Query failed.")
          reject(err);
        } else {
          console.log("Query successful.")
          
          let arr = result.rows
          let temp = {};
          let res = [];

          for (let i in arr) {
            if (!temp[arr[i].sale_id]) {
              res.push(
                {
                  inv_no: arr[i].sale_id,
                  date: helper.toDDMMYYYY(arr[i].sale_date),
                  sort: arr[i].sale_date,
                  range: "from " + helper.toDDMMYYYYstr(start) + " to " + helper.toDDMMYYYYstr(end),
                  total: arr[i].sale_value,
                  source: helper.cap(arr[i].sale_source),
                  src_ref: helper.cap(arr[i].src_ref),
                  pay_mode: helper.cap(arr[i].pay_mode),
                  items: []
                }
              )
              temp[arr[i].sale_id] = true;
            }
          }

          for (let i in res) {
            for (let k in arr)
              if (res[i].inv_no == arr[k].sale_id) {
                res[i].items.push({
                  sku: arr[k].sku,
                  brand: arr[k].brand,
                  model: arr[k].model,
                  qty: arr[k].quantity,
                  price: arr[k].price,
                  subtotal: arr[k].quantity * arr[k].price
                })
              }
          }

          
          let final = [];
          if (body.source) {
            for (let i = 0; i < res.length; i++) {     
              if ( res[i].source.toUpperCase() === body.source.toUpperCase() ) {
                final.push(res[i]);
              }
            }
            resolve(final);
          } else {
            resolve(res);
          }
        }
      });
    })
  },
  totalSalesByProduct : () => {
		return new Promise((resolve, reject) => {
			const queryString = "SELECT sku, brand, model, product_desc, SUM(quantity) as total_qty, sum(quantity*price) as total_cost FROM sale_products INNER JOIN sales ON sales.sale_id = sale_products.sale_id INNER JOIN products ON products.product_id = sale_products.product_id GROUP BY products.product_id;"
			console.log(queryString);

			db.query(queryString, (err, result) => {
				if (err) {
					console.log("Query failed.")
					reject(err);
				}
				else {
					console.log("Query successful.")
					resolve(result.rows)
				}
			})
		})
	}
}