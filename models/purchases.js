const db = require('../db');
const helper = require('../helpers/date')

module.exports = {
	getAllCurrentMonth: () => {
		return new Promise((resolve, reject) => {
			let queryString = "SELECT * FROM purchase_products INNER JOIN purchases ON purchases.pur_id = purchase_products.purchase_id INNER JOIN products ON products.product_id = purchase_products.product_id INNER JOIN suppliers ON purchases.supplier_id = suppliers.id;"

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
									inv_no: arr[i].inv_num,
									date: helper.toDDMMYYYY(arr[i].inv_date),
									month: helper.getCurrentMonthStr(),
									supplier: arr[i].name,
									total: arr[i].inv_value,
									credit: arr[i].credit,
									paid: arr[i].paid,
									pay_date: helper.toDDMMYYYY(arr[i].pay_date),
									pay_mode: arr[i].pay_mode,
									pay_ref: arr[i].pay_ref,
									items:[]
								}
							)
							temp[arr[i].inv_num] = true;
						}
					}

					for (let i in res) {
						for (let k in arr)
						if (res[i].inv_no == arr[k].inv_num) {
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

	getOutstandingInvoices : (req, res) => {
		return new Promise((resolve, reject) => {
			let queryString = "SELECT * FROM purchase_products INNER JOIN purchases ON purchases.pur_id = purchase_products.purchase_id INNER JOIN products ON products.product_id = purchase_products.product_id INNER JOIN suppliers ON purchases.supplier_id = suppliers.id WHERE purchases.paid = false;"
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
									inv_id: arr[i].pur_id,
									inv_no: arr[i].inv_num,
									date: helper.toDDMMYYYY(arr[i].inv_date),									
									supplier: arr[i].name,
									total: arr[i].inv_value,
									credit: arr[i].credit,
									paid: arr[i].paid,
									items:[]
								}
							)
							temp[arr[i].inv_num] = true;
						}
					}

					for (let i in res) {
						for (let k in arr)
						if (res[i].inv_no == arr[k].inv_num) {
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

	recordPurchase: (data) => {
		//Sanitize
		let invoice = {
			date: data.date.split("/")[1] + "/" + data.date.split("/")[0] + "/" + data.date.split("/")[2],
			supplier: data.supplier,
			inv_num: data.invoice_number,
			credit: data.credit_purchase ? true : false,
			total: 0,
			paid: !data.credit_purchase
		}

		for (let i = 0; i < data.list.length; i++) {
			invoice.total += (data.list[i].qty * data.list[i].cost)
		}
		//console.log(invoice)

		return new Promise((resolve, reject) => {
			const queryOne = "INSERT INTO purchases (inv_date, supplier_id, inv_num, inv_value, credit, paid) VALUES ('" + invoice.date + "', '" + invoice.supplier + "', '" + invoice.inv_num + "', '" + invoice.total + "', " + invoice.credit + ", " + invoice.paid + ") RETURNING pur_id;"
			console.log(queryOne);

			db.query(queryOne, (err, result) => {
				if (err) {
					console.log("Query failed.")
					reject(err);
				}
				let pur_id = result.rows[0].pur_id

				let queryTwo = 'INSERT INTO purchase_products (purchase_id, product_id, quantity, price) VALUES ';
				for (let i = 0; i < data.list.length; i++) {
					if (i == data.list.length - 1) {
						queryTwo += "(" + pur_id + "," + data.list[i].pid + "," + data.list[i].qty + "," + data.list[i].cost + ") RETURNING 1;"
					} else {
						queryTwo += "(" + pur_id + "," + data.list[i].pid + "," + data.list[i].qty + "," + data.list[i].cost + "),"
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
						resolve({ message: "Purchase successfully recorded." });
					}
				})
			});
		})
	},

	getById: (id) => {
		return new Promise((resolve, reject) => {
			const queryString = "SELECT * FROM products WHERE product_id='" + id + "';"

			db.query(queryString, (err, result) => {
				if (err) {
					console.log("Query failed.")
					reject(err);
				} else {
					console.log("Query successful.")
					resolve(result.rows);
				}
			});
		})
	},

	addPayment: (payload) => {
		let date = payload.pay_date.split("/")[1] + "/" + payload.pay_date.split("/")[0] + "/" + payload.pay_date.split("/")[2];

		return new Promise((resolve, reject) => {
			const queryString = "UPDATE purchases SET paid=true, pay_date='" + date + "', pay_mode='" + payload.pay_mode + "', pay_ref='" + payload.pay_ref + "' WHERE pur_id=" + payload.inv_id + ";"
			
			console.log(queryString);
			db.query(queryString, (err, result) => {
				if (err) {
					console.log("Query failed.")
					reject(err);
				} else {
					console.log("Query successful.")
					resolve(true);
				}
			});
		})
	}
}