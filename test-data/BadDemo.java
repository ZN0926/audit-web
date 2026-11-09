import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Random;

public class BadDemo {
    public static void main(String[] args) throws Exception {
        String user = "admin";
        String pwd = "123456";
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/demo", user, pwd);
        Statement st = conn.createStatement();
        String id = "1";
        st.execute("select * from users where id = " + id);
        String token = String.valueOf(new Random().nextInt(1000));
        System.out.println("token=" + token);
    }
}
